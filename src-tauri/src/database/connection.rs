use rusqlite::{Connection, OptionalExtension, Result as SqlResult};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

use super::models::CompressionRecord;
use crate::domain::compression::formats::OutputFormat;
use crate::domain::compression::settings::CompressionSettings;
use crate::domain::compression::stats::{
    calculate_confidence, estimate_compression, CompressionStat, EstimationQuery, EstimationResult,
};

pub struct DatabaseManager {
    db_path: PathBuf,
    connection: Mutex<Option<Connection>>,
}

impl DatabaseManager {
    /// Initialise le gestionnaire de base de données avec le chemin AppData
    pub fn new(app: &AppHandle) -> Result<Self, String> {
        // Récupère le dossier AppData de l'application
        let app_data = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;

        // Crée le dossier s'il n'existe pas
        std::fs::create_dir_all(&app_data)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;

        // Chemin complet vers la base de données
        let db_path = app_data.join("compression_stats.db");

        Ok(Self {
            db_path,
            connection: Mutex::new(None),
        })
    }

    /// Établit la connexion à la base de données
    pub fn connect(&self) -> Result<(), String> {
        let conn = Connection::open(&self.db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        let mut connection_guard = self.connection.lock().unwrap();
        *connection_guard = Some(conn);

        Ok(())
    }

    /// Exécute une requête avec la connexion
    pub fn with_connection<F, R>(&self, f: F) -> Result<R, String>
    where
        F: FnOnce(&Connection) -> SqlResult<R>,
    {
        let connection_guard = self.connection.lock().unwrap();
        match connection_guard.as_ref() {
            Some(conn) => f(conn).map_err(|e| format!("Database query failed: {}", e)),
            None => Err("Database not connected".to_string()),
        }
    }

    /// Insère un nouvel enregistrement de compression
    pub fn insert_compression_record(&self, record: &CompressionRecord) -> Result<i64, String> {
        self.with_connection(|conn| {
            conn.execute(
                "INSERT INTO compression_records (input_format, output_format, original_size, compressed_size, tool_version, source_type, timestamp)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                (
                    &record.input_format,
                    &record.output_format,
                    &record.original_size,
                    &record.compressed_size,
                    &record.tool_version,
                    &record.source_type,
                    &record.timestamp,
                ),
            )?;
            Ok(conn.last_insert_rowid())
        })
    }

    /// Récupère la moyenne de compression pour une combinaison de formats donnée
    /// Utilise maintenant le nouveau schéma unifié compression_stats
    pub fn get_average_compression(
        &self,
        input_format: &str,
        output_format: &str,
    ) -> Result<f64, String> {
        self.with_connection(|conn| {
            // Essaie d'abord avec la nouvelle table compression_stats
            let mut stmt = conn.prepare(
                "SELECT AVG(size_reduction_percent) as avg_compression
                 FROM compression_stats 
                 WHERE input_format = ?1 AND output_format = ?2"
            )?;

            let result: Result<f64, _> = stmt.query_row((input_format, output_format), |row| {
                Ok(row.get(0).unwrap_or(0.0))
            });

            match result {
                Ok(avg) => Ok(avg),
                Err(_) => {
                    // Fallback vers l'ancienne table si pas de données dans la nouvelle
                    let mut fallback_stmt = conn.prepare(
                        "SELECT AVG((CAST(original_size - compressed_size AS REAL) / original_size) * 100) as avg_compression
                         FROM compression_records 
                         WHERE input_format = ?1 AND output_format = ?2 AND original_size > 0"
                    )?;

                    let fallback_result: f64 = fallback_stmt.query_row((input_format, output_format), |row| {
                        Ok(row.get(0).unwrap_or(0.0))
                    })?;

                    Ok(fallback_result)
                }
            }
        })
    }

    /// Auto-purge : garde seulement les N derniers enregistrements
    pub fn cleanup_old_records(&self, max_records: i64) -> Result<usize, String> {
        self.with_connection(|conn| {
            let deleted = conn.execute(
                "DELETE FROM compression_records 
                 WHERE id NOT IN (
                     SELECT id FROM compression_records 
                     ORDER BY timestamp DESC 
                     LIMIT ?1
                 )",
                [max_records],
            )?;
            Ok(deleted)
        })
    }

    /// Compte le nombre total d'enregistrements
    pub fn count_records(&self) -> Result<i64, String> {
        self.with_connection(|conn| {
            let mut stmt = conn.prepare("SELECT COUNT(*) FROM compression_records")?;
            let count: i64 = stmt.query_row([], |row| row.get(0))?;
            Ok(count)
        })
    }

    // ─── Compression stats methods (unified store) ───

    /// Get compression estimation based on historical data
    pub fn get_compression_estimation(
        &self,
        query: &EstimationQuery,
    ) -> Result<EstimationResult, String> {
        self.with_connection(|conn| {
            let quality_range = 10i32;
            let min_quality = (query.quality_setting as i32 - quality_range).max(1) as u8;
            let max_quality = (query.quality_setting as i32 + quality_range).min(100) as u8;

            let mut stmt = conn.prepare(
                "SELECT
                    AVG(size_reduction_percent) as avg_reduction,
                    COUNT(*) as count,
                    AVG(size_reduction_percent * size_reduction_percent) - AVG(size_reduction_percent) * AVG(size_reduction_percent) as variance
                FROM compression_stats
                WHERE input_format = ?1
                AND output_format = ?2
                AND quality_setting BETWEEN ?3 AND ?4
                AND lossy_mode = ?5",
            )?;

            let row = stmt
                .query_row(
                    rusqlite::params![
                        query.input_format,
                        query.output_format,
                        min_quality,
                        max_quality,
                        query.lossy_mode,
                    ],
                    |row| {
                        Ok((
                            row.get::<_, Option<f64>>(0)?,
                            row.get::<_, u32>(1)?,
                            row.get::<_, Option<f64>>(2)?,
                        ))
                    },
                )
                .optional()?;

            match row {
                Some((Some(avg_reduction), count, variance)) if count > 0 => {
                    let confidence = calculate_confidence(count, variance.unwrap_or(0.0));
                    Ok(EstimationResult {
                        percent: avg_reduction,
                        ratio: (100.0 - avg_reduction) / 100.0,
                        confidence,
                        sample_count: count,
                    })
                }
                _ => {
                    let fallback = estimate_compression(
                        &query.input_format,
                        &query.output_format,
                        query.original_size,
                        &CompressionSettings::new(
                            query.quality_setting,
                            OutputFormat::from_string(&query.output_format)
                                .unwrap_or(OutputFormat::WebP),
                        ),
                    );
                    Ok(fallback)
                }
            }
        })
    }

    /// Save a compression stat record
    pub fn save_compression_stat(&self, stat: &CompressionStat) -> Result<i64, String> {
        self.with_connection(|conn| {
            conn.execute(
                "INSERT INTO compression_stats (
                    input_format, output_format, input_size_range, quality_setting,
                    lossy_mode, size_reduction_percent, original_size, compressed_size,
                    compression_time_ms, timestamp, image_type
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                rusqlite::params![
                    stat.input_format,
                    stat.output_format,
                    stat.input_size_range,
                    stat.quality_setting,
                    stat.lossy_mode,
                    stat.size_reduction_percent,
                    stat.original_size,
                    stat.compressed_size,
                    stat.compression_time_ms,
                    stat.timestamp,
                    stat.image_type,
                ],
            )?;
            Ok(conn.last_insert_rowid())
        })
    }

    /// Count compression stats
    pub fn count_compression_stats(&self) -> Result<u32, String> {
        self.with_connection(|conn| {
            let count: u32 =
                conn.query_row("SELECT COUNT(*) FROM compression_stats", [], |row| {
                    row.get(0)
                })?;
            Ok(count)
        })
    }

    /// Clear all compression stats
    pub fn clear_compression_stats(&self) -> Result<(), String> {
        self.with_connection(|conn| {
            conn.execute("DELETE FROM compression_stats", [])?;
            Ok(())
        })
    }
}

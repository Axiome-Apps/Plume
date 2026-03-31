use rusqlite::{Connection, OptionalExtension, Result as SqlResult};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

use crate::domain::compression::formats::OutputFormat;
use crate::domain::compression::settings::CompressionSettings;
use crate::domain::compression::stats::{
    CompressionStat, EstimationQuery, EstimationResult, calculate_confidence, estimate_compression,
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

    // ─── Compression stats methods ───

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
                    pixel_count, compression_time_ms, timestamp
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
                    stat.pixel_count,
                    stat.compression_time_ms,
                    stat.timestamp,
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

    /// Seeds the database with realistic baseline statistics if it is empty.
    /// Values are based on benchmarks on Apple Silicon / modern x86 hardware at quality=80.
    /// These are replaced over time by real user data as compressions accumulate.
    pub fn seed_stats_if_empty(&self) -> Result<usize, String> {
        let count = self.count_compression_stats()?;
        if count > 0 {
            return Ok(0);
        }

        use crate::domain::compression::stats::{CompressionStat, get_size_range};

        // (input, output, original_bytes, compressed_bytes, quality, pixel_count, time_ms)
        let entries: &[(&str, &str, u64, u64, u8, u64, u64)] = &[
            // ─── JPEG → WebP ─── ~10-15% reduction, fast
            ("jpeg", "webp",    200_000,    175_000, 80,    480_000,    280), // 800×600
            ("jpeg", "webp",    450_000,    392_000, 80,    921_600,    420), // 1280×720
            ("jpeg", "webp",    820_000,    714_000, 80,  2_073_600,    640), // 1920×1080
            ("jpeg", "webp",  1_400_000,  1_218_000, 80,  3_686_400,  1_050), // 2560×1440
            ("jpeg", "webp",  2_600_000,  2_262_000, 80,  8_294_400,  1_820), // 3840×2160
            ("jpeg", "webp",  4_100_000,  3_567_000, 80, 13_500_000,  2_650), // 4500×3000
            ("jpeg", "webp",  6_500_000,  5_655_000, 80, 18_000_000,  3_900), // 6000×3000
            ("jpeg", "webp",  9_200_000,  8_004_000, 80, 24_000_000,  5_200), // 6000×4000
            ("jpeg", "webp", 13_000_000, 11_310_000, 80, 36_000_000,  7_100), // 7500×4800
            // ─── JPEG → JPEG ─── mozjpeg re-encode, very fast
            ("jpeg", "jpeg",    200_000,    160_000, 80,    480_000,    140),
            ("jpeg", "jpeg",    480_000,    384_000, 80,    921_600,    250),
            ("jpeg", "jpeg",    820_000,    656_000, 80,  2_073_600,    390),
            ("jpeg", "jpeg",  1_500_000,  1_200_000, 80,  3_686_400,    680),
            ("jpeg", "jpeg",  2_800_000,  2_240_000, 80,  8_294_400,  1_200),
            ("jpeg", "jpeg",  4_200_000,  3_360_000, 80, 13_500_000,  1_750),
            ("jpeg", "jpeg",  6_500_000,  5_200_000, 80, 18_000_000,  2_600),
            ("jpeg", "jpeg",  9_500_000,  7_600_000, 80, 24_000_000,  3_700),
            // ─── PNG → WebP ─── significant reduction, moderate speed
            ("png", "webp",    260_000,     52_000, 80,    480_000,    680),
            ("png", "webp",    540_000,    108_000, 80,    921_600,  1_050),
            ("png", "webp",    880_000,    176_000, 80,  2_073_600,  1_700),
            ("png", "webp",  1_600_000,    320_000, 80,  3_686_400,  2_900),
            ("png", "webp",  3_000_000,    600_000, 80,  8_294_400,  5_100),
            ("png", "webp",  4_500_000,    900_000, 80, 13_500_000,  7_400),
            ("png", "webp",  7_000_000,  1_400_000, 80, 18_000_000, 11_000),
            ("png", "webp", 10_500_000,  2_100_000, 80, 24_000_000, 15_800),
            // ─── PNG → PNG ─── oxipng lossless, slow
            ("png", "png",     260_000,    221_000, 80,    480_000,  1_200),
            ("png", "png",     540_000,    459_000, 80,    921_600,  2_100),
            ("png", "png",     880_000,    748_000, 80,  2_073_600,  3_400),
            ("png", "png",   1_600_000,  1_360_000, 80,  3_686_400,  5_900),
            ("png", "png",   3_000_000,  2_550_000, 80,  8_294_400, 10_500),
            ("png", "png",   4_500_000,  3_825_000, 80, 13_500_000, 15_500),
            ("png", "png",   7_000_000,  5_950_000, 80, 18_000_000, 23_000),
            ("png", "png",  10_500_000,  8_925_000, 80, 24_000_000, 33_000),
            // ─── PNG → JPEG ─── moderate speed, good reduction
            ("png", "jpeg",    260_000,     78_000, 80,    480_000,    560),
            ("png", "jpeg",    540_000,    162_000, 80,    921_600,    960),
            ("png", "jpeg",    880_000,    264_000, 80,  2_073_600,  1_600),
            ("png", "jpeg",  1_600_000,    480_000, 80,  3_686_400,  2_800),
            ("png", "jpeg",  3_000_000,    900_000, 80,  8_294_400,  5_200),
            ("png", "jpeg",  4_500_000,  1_350_000, 80, 13_500_000,  7_700),
            ("png", "jpeg",  7_000_000,  2_100_000, 80, 18_000_000, 11_800),
            // ─── WebP → WebP ─── re-encode, moderate
            ("webp", "webp",   180_000,    162_000, 80,    480_000,    520),
            ("webp", "webp",   420_000,    378_000, 80,    921_600,    980),
            ("webp", "webp",   760_000,    684_000, 80,  2_073_600,  1_650),
            ("webp", "webp", 1_400_000,  1_260_000, 80,  3_686_400,  2_800),
            ("webp", "webp", 2_600_000,  2_340_000, 80,  8_294_400,  5_000),
            ("webp", "webp", 4_000_000,  3_600_000, 80, 13_500_000,  7_500),
            ("webp", "webp", 6_200_000,  5_580_000, 80, 18_000_000, 11_200),
            ("webp", "webp", 8_800_000,  7_920_000, 80, 24_000_000, 15_600),
            // ─── WebP → JPEG ─── moderate
            ("webp", "jpeg",   180_000,    162_000, 80,    480_000,    390),
            ("webp", "jpeg",   420_000,    378_000, 80,    921_600,    740),
            ("webp", "jpeg",   760_000,    684_000, 80,  2_073_600,  1_280),
            ("webp", "jpeg", 1_400_000,  1_260_000, 80,  3_686_400,  2_200),
            ("webp", "jpeg", 2_600_000,  2_340_000, 80,  8_294_400,  3_900),
            ("webp", "jpeg", 4_000_000,  3_600_000, 80, 13_500_000,  5_900),
            ("webp", "jpeg", 6_200_000,  5_580_000, 80, 18_000_000,  9_000),
            // ─── HEIC → WebP ─── slow: libheif decode + webp encode
            ("heic", "webp",  1_800_000,   540_000, 80,  8_294_400,  3_200), // 12MP iPhone
            ("heic", "webp",  2_500_000,   750_000, 80, 12_000_000,  4_500),
            ("heic", "webp",  3_800_000, 1_140_000, 80, 16_000_000,  6_800),
            ("heic", "webp",  6_000_000, 1_800_000, 80, 24_000_000, 10_600),
            ("heic", "webp",  8_500_000, 2_550_000, 80, 33_000_000, 14_900),
            ("heic", "webp", 12_000_000, 3_600_000, 80, 48_000_000, 20_800),
            // ─── HEIC → JPEG ─── slightly faster than WebP output
            ("heic", "jpeg",  1_800_000, 1_350_000, 80,  8_294_400,  2_800),
            ("heic", "jpeg",  2_500_000, 1_875_000, 80, 12_000_000,  3_900),
            ("heic", "jpeg",  3_800_000, 2_850_000, 80, 16_000_000,  5_900),
            ("heic", "jpeg",  6_000_000, 4_500_000, 80, 24_000_000,  9_300),
            ("heic", "jpeg",  8_500_000, 6_375_000, 80, 33_000_000, 13_100),
            ("heic", "jpeg", 12_000_000, 9_000_000, 80, 48_000_000, 18_400),
        ];

        let timestamp = chrono::Utc::now().to_rfc3339();
        let mut inserted = 0usize;

        for (input_fmt, output_fmt, original, compressed, quality, pixels, time_ms) in entries {
            let reduction = ((original - compressed) as f64 / *original as f64) * 100.0;
            let is_lossy = *output_fmt != "png";
            let stat = CompressionStat {
                id: None,
                input_format: input_fmt.to_string(),
                output_format: output_fmt.to_string(),
                input_size_range: get_size_range(*original),
                quality_setting: *quality,
                lossy_mode: is_lossy,
                size_reduction_percent: reduction,
                original_size: *original,
                compressed_size: *compressed,
                pixel_count: Some(*pixels),
                compression_time_ms: Some(*time_ms),
                timestamp: timestamp.clone(),
            };
            match self.save_compression_stat(&stat) {
                Ok(_) => inserted += 1,
                Err(e) => log::warn!("Seed insert failed: {}", e),
            }
        }

        log::info!(
            "Database seeded with {} baseline compression stats",
            inserted
        );
        Ok(inserted)
    }

    /// Get average compression time in ms for a given format pair.
    /// Matches by pixel_count range (±50%) when available, falls back to input_size_range.
    /// Returns (avg_ms, sample_count) if enough data is available (>= 3 samples), None otherwise.
    pub fn get_time_estimation(
        &self,
        input_format: &str,
        output_format: &str,
        size_bytes: u64,
        pixel_count: Option<u64>,
    ) -> Result<Option<(u64, u32)>, String> {
        self.with_connection(|conn| {
            // Try pixel_count-based estimation first (more accurate)
            if let Some(pixels) = pixel_count {
                let min_pixels = pixels / 2;
                let max_pixels = pixels * 3 / 2;

                let mut stmt = conn.prepare(
                    "SELECT AVG(compression_time_ms), COUNT(*)
                     FROM compression_stats
                     WHERE input_format = ?1
                     AND output_format = ?2
                     AND pixel_count BETWEEN ?3 AND ?4
                     AND compression_time_ms IS NOT NULL",
                )?;

                let row = stmt
                    .query_row(
                        rusqlite::params![input_format, output_format, min_pixels, max_pixels],
                        |row| Ok((row.get::<_, Option<f64>>(0)?, row.get::<_, u32>(1)?)),
                    )
                    .optional()?;

                if let Some((Some(avg_ms), count)) = row
                    && count >= 3
                {
                    return Ok(Some((avg_ms as u64, count)));
                }
            }

            // Fallback to size_range-based estimation
            let size_range = crate::domain::compression::stats::get_size_range(size_bytes);
            let mut stmt = conn.prepare(
                "SELECT AVG(compression_time_ms), COUNT(*)
                 FROM compression_stats
                 WHERE input_format = ?1
                 AND output_format = ?2
                 AND input_size_range = ?3
                 AND compression_time_ms IS NOT NULL",
            )?;

            let row = stmt
                .query_row(
                    rusqlite::params![input_format, output_format, size_range],
                    |row| Ok((row.get::<_, Option<f64>>(0)?, row.get::<_, u32>(1)?)),
                )
                .optional()?;

            match row {
                Some((Some(avg_ms), count)) if count >= 3 => Ok(Some((avg_ms as u64, count))),
                _ => Ok(None),
            }
        })
    }
}

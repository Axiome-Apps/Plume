use crate::domain::compression::{
    error::{StatsError, StatsResult},
    formats::OutputFormat,
    settings::CompressionSettings,
    stats::{CompressionStat, EstimationQuery, EstimationResult},
};
use rusqlite::{Connection, OptionalExtension};

/// Trait for storing and retrieving compression statistics
pub trait StatsStore {
    /// Save a compression statistic
    fn save_stat(&mut self, stat: CompressionStat) -> StatsResult<i64>;

    /// Get compression estimation based on historical data
    fn get_estimation(&self, query: &EstimationQuery) -> StatsResult<EstimationResult>;

    /// Clear all statistics
    fn clear_all(&mut self) -> StatsResult<()>;

    /// Get statistics count
    fn count_stats(&self) -> StatsResult<u32>;
}

/// SQLite implementation of the stats store
pub struct SqliteStatsStore {
    conn: Connection,
}

impl SqliteStatsStore {
    /// Create a new SQLite stats store
    pub fn new(db_path: &str) -> StatsResult<Self> {
        let conn =
            Connection::open(db_path).map_err(|e| StatsError::DatabaseError(e.to_string()))?;

        let store = SqliteStatsStore { conn };
        store.init_tables()?;
        Ok(store)
    }

    /// Create an in-memory stats store (for testing)
    pub fn in_memory() -> StatsResult<Self> {
        let conn =
            Connection::open_in_memory().map_err(|e| StatsError::DatabaseError(e.to_string()))?;

        let store = SqliteStatsStore { conn };
        store.init_tables()?;
        Ok(store)
    }

    fn init_tables(&self) -> StatsResult<()> {
        self.conn
            .execute(
                r#"
            CREATE TABLE IF NOT EXISTS compression_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                input_format TEXT NOT NULL,
                output_format TEXT NOT NULL,
                input_size_range TEXT NOT NULL,
                quality_setting INTEGER NOT NULL,
                lossy_mode BOOLEAN NOT NULL,
                size_reduction_percent REAL NOT NULL,
                original_size INTEGER NOT NULL,
                compressed_size INTEGER NOT NULL,
                compression_time_ms INTEGER,
                timestamp TEXT NOT NULL,
                image_type TEXT
            )
            "#,
                [],
            )
            .map_err(|e| StatsError::DatabaseError(e.to_string()))?;

        Ok(())
    }
}

impl StatsStore for SqliteStatsStore {
    fn save_stat(&mut self, mut stat: CompressionStat) -> StatsResult<i64> {
        let _id = self
            .conn
            .execute(
                r#"
            INSERT INTO compression_stats (
                input_format, output_format, input_size_range, quality_setting,
                lossy_mode, size_reduction_percent, original_size, compressed_size,
                compression_time_ms, timestamp, image_type
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            "#,
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
            )
            .map_err(|e| StatsError::DatabaseError(e.to_string()))?;

        let id = self.conn.last_insert_rowid();
        stat.id = Some(id);
        Ok(id)
    }

    fn get_estimation(&self, query: &EstimationQuery) -> StatsResult<EstimationResult> {
        // Try to find similar compression operations
        let mut stmt = self
            .conn
            .prepare(
                r#"
            SELECT 
                AVG(size_reduction_percent) as avg_reduction,
                COUNT(*) as count,
                STDEV(size_reduction_percent) as variance
            FROM compression_stats 
            WHERE input_format = ?1 
            AND output_format = ?2 
            AND quality_setting BETWEEN ?3 AND ?4
            AND lossy_mode = ?5
            "#,
            )
            .map_err(|e| StatsError::DatabaseError(e.to_string()))?;

        let quality_range = 10; // +/- 10 quality points
        let min_quality = (query.quality_setting as i32 - quality_range).max(1) as u8;
        let max_quality = (query.quality_setting as i32 + quality_range).min(100) as u8;

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
                        row.get::<_, Option<f64>>("avg_reduction")?,
                        row.get::<_, u32>("count")?,
                        row.get::<_, Option<f64>>("variance")?,
                    ))
                },
            )
            .optional()
            .map_err(|e| StatsError::DatabaseError(e.to_string()))?;

        match row {
            Some((Some(avg_reduction), count, variance)) => {
                let confidence = crate::domain::compression::stats::calculate_confidence(
                    count,
                    variance.unwrap_or(0.0),
                );
                Ok(EstimationResult {
                    percent: avg_reduction,
                    ratio: (100.0 - avg_reduction) / 100.0,
                    confidence,
                    sample_count: count,
                })
            }
            _ => {
                // No historical data, use heuristics
                let fallback = crate::domain::compression::stats::estimate_compression(
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
    }

    fn clear_all(&mut self) -> StatsResult<()> {
        self.conn
            .execute("DELETE FROM compression_stats", [])
            .map_err(|e| StatsError::DatabaseError(e.to_string()))?;
        Ok(())
    }

    fn count_stats(&self) -> StatsResult<u32> {
        let count: u32 = self
            .conn
            .query_row("SELECT COUNT(*) FROM compression_stats", [], |row| {
                row.get(0)
            })
            .map_err(|e| StatsError::DatabaseError(e.to_string()))?;

        Ok(count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::compression::stats;

    #[test]
    fn test_sqlite_store_creation() {
        let store = SqliteStatsStore::in_memory();
        assert!(store.is_ok());
    }

    #[test]
    fn test_save_and_retrieve_stat() {
        let mut store = SqliteStatsStore::in_memory().unwrap();

        let stat = stats::create_stat(
            "png".to_string(),
            "webp".to_string(),
            1000000,
            400000,
            &CompressionSettings::new(80, OutputFormat::WebP),
        );

        let id = store.save_stat(stat).unwrap();
        assert!(id > 0);

        let count = store.count_stats().unwrap();
        assert_eq!(count, 1);
    }
}

use rusqlite::{Connection, Result as SqlResult};

pub fn create_tables(conn: &Connection) -> SqlResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS compression_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            input_format TEXT NOT NULL,
            output_format TEXT NOT NULL,
            input_size_range TEXT NOT NULL,
            quality_setting INTEGER NOT NULL,
            lossy_mode BOOLEAN NOT NULL,
            size_reduction_percent REAL NOT NULL,
            original_size INTEGER NOT NULL,
            compressed_size INTEGER NOT NULL,
            pixel_count INTEGER,
            compression_time_ms INTEGER,
            timestamp TEXT NOT NULL
        )",
        [],
    )?;

    // Add pixel_count column if upgrading from older schema
    let _ = conn.execute(
        "ALTER TABLE compression_stats ADD COLUMN pixel_count INTEGER",
        [],
    );

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_compression_formats
         ON compression_stats(input_format, output_format, quality_setting)",
        [],
    )?;

    log::debug!("Database tables and indexes created successfully");
    Ok(())
}

pub fn initialize_database(conn: &Connection) -> SqlResult<()> {
    create_tables(conn)?;

    let mut stmt = conn.prepare("SELECT COUNT(*) FROM compression_stats")?;
    let count: i64 = stmt.query_row([], |row| row.get(0))?;

    if count == 0 {
        log::debug!("Database is empty, will be seeded with initial data");
    } else {
        log::debug!(
            "Database already contains {} compression stats records",
            count
        );
    }

    Ok(())
}

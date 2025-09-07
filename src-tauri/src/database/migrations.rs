use rusqlite::{Connection, Result as SqlResult};

/// Crée les tables de la base de données si elles n'existent pas
pub fn create_tables(conn: &Connection) -> SqlResult<()> {
    // Table principale pour les enregistrements de compression
    conn.execute(
        "CREATE TABLE IF NOT EXISTS compression_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            input_format TEXT NOT NULL,
            output_format TEXT NOT NULL,
            original_size INTEGER NOT NULL,
            compressed_size INTEGER NOT NULL,
            tool_version TEXT,
            source_type TEXT NOT NULL,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    // Index pour améliorer les performances des requêtes de moyennes
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_formats 
         ON compression_records(input_format, output_format)",
        [],
    )?;

    // Index pour le nettoyage par timestamp
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_timestamp 
         ON compression_records(timestamp)",
        [],
    )?;

    println!("Database tables and indexes created successfully");
    Ok(())
}

/// Initialise la base de données avec les tables et données de base
pub fn initialize_database(conn: &Connection) -> SqlResult<()> {
    create_tables(conn)?;

    // Vérifie si la base est vide (première installation)
    let mut stmt = conn.prepare("SELECT COUNT(*) FROM compression_records")?;
    let count: i64 = stmt.query_row([], |row| row.get(0))?;

    if count == 0 {
        println!("Database is empty, will be seeded with initial data");
        // La logique de seeding sera appelée depuis le gestionnaire principal
    } else {
        println!("Database already contains {} records", count);
    }

    Ok(())
}

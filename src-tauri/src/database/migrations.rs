use rusqlite::{Connection, Result as SqlResult};

/// Crée les tables de la base de données si elles n'existent pas
pub fn create_tables(conn: &Connection) -> SqlResult<()> {
    // Table principale unifiée pour les statistiques de compression (nouveau schéma)
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
            compression_time_ms INTEGER,
            timestamp TEXT NOT NULL,
            image_type TEXT
        )",
        [],
    )?;

    // Index pour améliorer les performances des requêtes d'estimation
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_compression_formats 
         ON compression_stats(input_format, output_format, quality_setting)",
        [],
    )?;

    // Index pour les requêtes par taille et type
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_size_type 
         ON compression_stats(input_size_range, image_type)",
        [],
    )?;

    // Index pour le nettoyage par timestamp
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_compression_timestamp 
         ON compression_stats(timestamp)",
        [],
    )?;

    // Garder l'ancienne table pour la compatibilité si elle existe (lecture seule)
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

    println!("Database tables and indexes created successfully");
    Ok(())
}

/// Initialise la base de données avec les tables et données de base
pub fn initialize_database(conn: &Connection) -> SqlResult<()> {
    create_tables(conn)?;

    // Vérifie si la base est vide (première installation)
    let mut stmt = conn.prepare("SELECT COUNT(*) FROM compression_stats")?;
    let count: i64 = stmt.query_row([], |row| row.get(0))?;

    if count == 0 {
        println!("Database is empty, will be seeded with initial data");
        // La logique de seeding sera appelée depuis le gestionnaire principal
    } else {
        println!(
            "Database already contains {} compression stats records",
            count
        );
    }

    Ok(())
}

use crate::database::{migrations, DatabaseManager};
use tauri::AppHandle;

/// Test database connection
#[tauri::command]
pub async fn test_database_connection(app: AppHandle) -> Result<String, String> {
    println!("Testing database connection...");
    let db_manager = DatabaseManager::new(&app)?;
    db_manager.connect()?;
    Ok("Database connection successful".to_string())
}

/// Initialise la base de données au démarrage de l'application
#[tauri::command]
pub async fn init_database(app: AppHandle) -> Result<String, String> {
    println!("Initializing database...");

    // Crée le gestionnaire de base de données
    let db_manager = DatabaseManager::new(&app)?;

    // Établit la connexion
    db_manager.connect()?;

    // Crée les tables si nécessaires
    db_manager.with_connection(|conn| migrations::initialize_database(conn))?;

    let count = db_manager.count_records()?;
    let message = format!("Database initialized successfully with {} records", count);

    println!("{}", message);
    Ok(message)
}

/// Obtient les statistiques moyennes de compression pour une combinaison de formats
#[tauri::command]
pub async fn get_compression_prediction(
    input_format: String,
    output_format: String,
    app: AppHandle,
) -> Result<f64, String> {
    let db_manager = DatabaseManager::new(&app)?;
    db_manager.connect()?;

    let avg = db_manager.get_average_compression(&input_format, &output_format)?;

    // Si aucune donnée, retourne une estimation basique
    if avg == 0.0 {
        let default_compression = match (input_format.as_str(), output_format.as_str()) {
            ("PNG", "WebP") => 70.0,
            ("JPEG", "WebP") => 25.0,
            ("PNG", "PNG") => 15.0,
            ("JPEG", "JPEG") => 20.0,
            _ => 10.0,
        };
        Ok(default_compression)
    } else {
        Ok(avg)
    }
}

/// Enregistre un nouveau résultat de compression
#[tauri::command]
pub async fn record_compression_result(
    input_format: String,
    output_format: String,
    original_size: i64,
    compressed_size: i64,
    tool_version: Option<String>,
    app: AppHandle,
) -> Result<String, String> {
    let db_manager = DatabaseManager::new(&app)?;
    db_manager.connect()?;

    use crate::database::models::CompressionRecord;

    let record = CompressionRecord::new(
        input_format,
        output_format,
        original_size,
        compressed_size,
        tool_version,
        "actual".to_string(),
    );

    let id = db_manager.insert_compression_record(&record)?;

    // Auto-nettoyage : garde max 1000 enregistrements
    db_manager.cleanup_old_records(1000)?;

    Ok(format!("Compression result recorded with ID: {}", id))
}

/// Obtient le nombre d'enregistrements dans la base
#[tauri::command]
pub async fn get_database_stats(app: AppHandle) -> Result<i64, String> {
    let db_manager = DatabaseManager::new(&app)?;
    db_manager.connect()?;
    db_manager.count_records()
}

/// Peuple la base de données avec des statistiques réalistes de compression
#[tauri::command]
pub async fn seed_compression_database(app: AppHandle) -> Result<String, String> {
    let db_manager = DatabaseManager::new(&app)?;
    db_manager.connect()?;

    // Vérifie si la base a déjà des données
    let existing_count = db_manager.count_records()?;
    if existing_count > 0 {
        return Ok(format!(
            "Database already contains {} records, skipping seed",
            existing_count
        ));
    }

    use crate::database::models::CompressionRecord;

    // Statistiques réalistes basées sur les recherches
    let seed_data = vec![
        // PNG vers WebP - 70-80% de réduction
        ("PNG", "WebP", 1024000, 256000, Some("v1.3.2".to_string())),
        ("PNG", "WebP", 2048000, 460800, Some("v1.3.2".to_string())),
        ("PNG", "WebP", 512000, 122880, Some("v1.3.2".to_string())),
        ("PNG", "WebP", 4096000, 983040, Some("v1.3.2".to_string())),
        ("PNG", "WebP", 256000, 61440, Some("v1.3.2".to_string())),
        // JPEG vers WebP - 25-35% de réduction
        ("JPEG", "WebP", 800000, 560000, Some("v1.3.2".to_string())),
        ("JPEG", "WebP", 1500000, 1050000, Some("v1.3.2".to_string())),
        ("JPEG", "WebP", 600000, 420000, Some("v1.3.2".to_string())),
        ("JPEG", "WebP", 2000000, 1400000, Some("v1.3.2".to_string())),
        ("JPEG", "WebP", 300000, 210000, Some("v1.3.2".to_string())),
        // PNG vers PNG (optimisation) - 10-20% de réduction
        (
            "PNG",
            "PNG",
            1024000,
            860000,
            Some("oxipng-9.1".to_string()),
        ),
        (
            "PNG",
            "PNG",
            2048000,
            1740000,
            Some("oxipng-9.1".to_string()),
        ),
        ("PNG", "PNG", 512000, 430000, Some("oxipng-9.1".to_string())),
        (
            "PNG",
            "PNG",
            4096000,
            3480000,
            Some("oxipng-9.1".to_string()),
        ),
        // JPEG vers JPEG (recompression) - 15-25% de réduction
        ("JPEG", "JPEG", 800000, 640000, Some("mozjpeg".to_string())),
        (
            "JPEG",
            "JPEG",
            1500000,
            1200000,
            Some("mozjpeg".to_string()),
        ),
        ("JPEG", "JPEG", 600000, 480000, Some("mozjpeg".to_string())),
        (
            "JPEG",
            "JPEG",
            2000000,
            1600000,
            Some("mozjpeg".to_string()),
        ),
        // Cas spéciaux - petites images
        ("PNG", "WebP", 50000, 15000, Some("v1.3.2".to_string())),
        ("JPEG", "WebP", 75000, 60000, Some("v1.3.2".to_string())),
        // Cas spéciaux - très grandes images
        ("PNG", "WebP", 8192000, 1638400, Some("v1.3.2".to_string())),
        (
            "JPEG",
            "WebP",
            10240000,
            7168000,
            Some("v1.3.2".to_string()),
        ),
    ];

    let mut inserted_count = 0;
    for (input_format, output_format, original_size, compressed_size, tool_version) in seed_data {
        let record = CompressionRecord::new(
            input_format.to_string(),
            output_format.to_string(),
            original_size,
            compressed_size,
            tool_version,
            "seed".to_string(), // Marquer comme données de seed
        );

        match db_manager.insert_compression_record(&record) {
            Ok(_) => inserted_count += 1,
            Err(e) => println!("Failed to insert seed record: {}", e),
        }
    }

    Ok(format!(
        "Successfully seeded database with {} compression records",
        inserted_count
    ))
}

/// Teste la prédiction de compression basée sur l'historique
#[tauri::command]
pub async fn test_compression_prediction(
    input_format: String,
    output_format: String,
    original_size: i64,
    app: AppHandle,
) -> Result<String, String> {
    use crate::domain::CompressionPredictionService;

    let prediction_service = CompressionPredictionService::new(&app)
        .map_err(|e| format!("Failed to create prediction service: {:?}", e))?;

    let result = prediction_service
        .predict_compression(&input_format, &output_format, original_size)
        .map_err(|e| format!("Prediction failed: {:?}", e))?;

    Ok(format!(
        "Prediction for {} → {} ({} bytes):\n• Compression: {:.1}% reduction\n• Ratio: {:.3}\n• Confidence: {:.1}%\n• Sample count: {}",
        input_format,
        output_format,
        original_size,
        result.percent,
        result.ratio,
        result.confidence * 100.0,
        result.sample_count
    ))
}

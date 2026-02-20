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
    db_manager.with_connection(migrations::initialize_database)?;

    // Auto-seed baseline data if the stats table is empty
    let seeded = db_manager.seed_stats_if_empty()?;

    let stats_count = db_manager.count_compression_stats().unwrap_or(0);
    let message = if seeded > 0 {
        format!(
            "Database initialized and seeded with {} baseline stats",
            seeded
        )
    } else {
        format!("Database initialized ({} compression stats)", stats_count)
    };

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

/// Peuple la base de données avec des statistiques réalistes de compression.
/// Ne fait rien si la base contient déjà des données.
#[tauri::command]
pub async fn seed_compression_database(app: AppHandle) -> Result<String, String> {
    let db_manager = DatabaseManager::new(&app)?;
    db_manager.connect()?;

    let inserted = db_manager.seed_stats_if_empty()?;

    if inserted == 0 {
        let count = db_manager.count_compression_stats().unwrap_or(0);
        Ok(format!(
            "Database already contains {} compression stats, skipping seed",
            count
        ))
    } else {
        Ok(format!(
            "Successfully seeded database with {} compression stats",
            inserted
        ))
    }
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

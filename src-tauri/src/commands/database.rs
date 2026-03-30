use crate::database::{DatabaseManager, migrations};
use tauri::AppHandle;

/// Test database connection
#[tauri::command]
pub async fn test_database_connection(app: AppHandle) -> Result<String, String> {
    log::debug!("Testing database connection...");
    let db_manager = DatabaseManager::new(&app)?;
    db_manager.connect()?;
    Ok("Database connection successful".to_string())
}

/// Initialise la base de données au démarrage de l'application
#[tauri::command]
pub async fn init_database(app: AppHandle) -> Result<String, String> {
    log::info!("Initializing database...");

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

    log::info!("{}", message);
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

    let query = crate::domain::EstimationQuery {
        input_format,
        output_format,
        original_size: 1_000_000,
        quality_setting: 80,
        lossy_mode: true,
    };

    let estimation = db_manager.get_compression_estimation(&query)?;
    Ok(estimation.percent)
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

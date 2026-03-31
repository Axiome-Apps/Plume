use crate::database::{DatabaseManager, migrations};
use tauri::AppHandle;

/// Initialise la base de données au démarrage de l'application
#[tauri::command]
pub async fn init_database(app: AppHandle) -> Result<String, String> {
    log::info!("Initializing database...");

    let db_manager = DatabaseManager::new(&app)?;
    db_manager.connect()?;
    db_manager.with_connection(migrations::initialize_database)?;

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

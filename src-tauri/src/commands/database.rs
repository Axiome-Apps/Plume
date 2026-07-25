use crate::commands::CommandError;
use crate::database::{DatabaseManager, migrations};
use tauri::State;

/// Runs the schema migrations and baseline seed on the shared connection
/// (already opened in `setup`). Called once by the frontend at startup.
#[tauri::command]
pub async fn init_database(db: State<'_, DatabaseManager>) -> Result<String, CommandError> {
    log::info!("Initializing database...");

    db.with_connection(migrations::initialize_database)
        .map_err(CommandError::internal)?;

    let seeded = db.seed_stats_if_empty().map_err(CommandError::internal)?;
    let stats_count = db.count_compression_stats().unwrap_or(0);

    let message = if seeded > 0 {
        format!("Database initialized and seeded with {seeded} baseline stats")
    } else {
        format!("Database initialized ({stats_count} compression stats)")
    };

    log::info!("{message}");
    Ok(message)
}

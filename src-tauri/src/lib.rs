mod commands;
pub mod database;
pub mod domain;

use commands::{
    clear_app_temporary_files, compress_batch, compress_image, generate_preview,
    get_compression_estimation, get_file_information, get_stats_count, get_stats_summary,
    record_compression_stat, reset_compression_stats, save_all_to_downloads, save_to_downloads,
    select_image_files,
};

use crate::domain::initialize;

// Commande de test simple pour la database
#[tauri::command]
async fn test_database_connection(app: tauri::AppHandle) -> Result<String, String> {
    use crate::database::{migrations, DatabaseManager};

    let db_manager = DatabaseManager::new(&app)?;
    db_manager.connect()?;

    db_manager.with_connection(|conn| migrations::create_tables(conn))?;

    let count = db_manager.count_records()?;
    Ok(format!(
        "Database connection successful! Tables created, {} records found",
        count
    ))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize application state
    let app_state = initialize().expect("Failed to initialize application");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            compress_image,
            compress_batch,
            select_image_files,
            save_to_downloads,
            save_all_to_downloads,
            generate_preview,
            clear_app_temporary_files,
            get_file_information,
            get_stats_count,
            get_stats_summary,
            get_compression_estimation,
            record_compression_stat,
            reset_compression_stats,
            test_database_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

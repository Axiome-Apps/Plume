mod commands;
pub mod database;
pub mod domain;

use commands::{
    compress_image, get_compression_estimation, get_file_information, get_progress_estimation,
    init_database, record_compression_stat, reset_compression_stats, select_image_files,
};

use crate::domain::initialize;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let app_state = initialize().expect("Failed to initialize application");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            compress_image,
            select_image_files,
            get_file_information,
            get_compression_estimation,
            record_compression_stat,
            reset_compression_stats,
            get_progress_estimation,
            init_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

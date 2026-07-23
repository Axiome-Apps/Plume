mod commands;
pub mod database;
pub mod domain;

use commands::{
    compress_image, get_compression_estimation, get_file_information, get_progress_estimation,
    init_database, select_image_files,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            compress_image,
            select_image_files,
            get_file_information,
            get_compression_estimation,
            get_progress_estimation,
            init_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

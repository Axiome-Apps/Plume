// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
pub mod database;
pub mod domain;

use crate::domain::initialize;
use commands::{
    clear_app_temporary_files, compress_batch, compress_image, create_progress_config,
    generate_preview, get_compression_estimation, get_default_compression_times,
    get_file_information, get_progress_estimation, get_stats_count, get_stats_summary,
    init_database, record_compression_result, record_compression_result_with_time,
    record_compression_stat, reset_compression_stats, save_all_to_downloads, save_to_downloads,
    seed_compression_database, select_image_files, test_compression_prediction,
};

// Garde la fonction greet pour l'instant
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    // Initialize application state
    let app_state = initialize().expect("Failed to initialize application");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            greet,
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
            record_compression_result_with_time,
            reset_compression_stats,
            get_progress_estimation,
            create_progress_config,
            get_default_compression_times,
            init_database,
            seed_compression_database,
            test_compression_prediction,
            record_compression_result
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
pub mod domain;
pub mod infrastructure;

use commands::{
    cleanup_temp_files, compress_batch, compress_image, generate_preview, save_all_to_downloads,
    save_dropped_files, save_to_downloads,
};

// Garde la fonction greet pour l'instant
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            compress_image,
            compress_batch,
            save_dropped_files,
            save_to_downloads,
            save_all_to_downloads,
            generate_preview,
            cleanup_temp_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

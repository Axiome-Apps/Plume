pub mod domain;
pub mod infrastructure;
mod commands;

use commands::{
    compress_image, 
    compress_batch, 
    save_dropped_files, 
    save_to_downloads, 
    save_all_to_downloads, 
    generate_preview,
    cleanup_temp_files
};

// Garde la fonction greet pour l'instant
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
use crate::domain::{AppState, get_file_info};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn select_image_files(
    app_handle: AppHandle,
    _state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let files = app_handle
        .dialog()
        .file()
        .add_filter("Images", &["png", "jpg", "jpeg", "webp", "heic", "heif"])
        .set_title("Sélectionner des images")
        .blocking_pick_files();

    match files {
        Some(paths) => {
            let path_strings: Vec<String> = paths
                .into_iter()
                .filter_map(|p| p.into_path().ok())
                .map(|p| p.to_string_lossy().to_string())
                .collect();
            Ok(path_strings)
        }
        None => Ok(vec![]),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub extension: Option<String>,
    pub is_image: bool,
}

#[tauri::command]
pub async fn get_file_information(
    file_path: String,
    _state: State<'_, AppState>,
) -> Result<FileInfo, String> {
    let path = Path::new(&file_path);
    let metadata = get_file_info(path).map_err(|e| format!("Failed to get file info: {}", e))?;

    Ok(FileInfo {
        path: file_path,
        name: metadata.name,
        size: metadata.size,
        extension: metadata.extension,
        is_image: metadata.is_image,
    })
}

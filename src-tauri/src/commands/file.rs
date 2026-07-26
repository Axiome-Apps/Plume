use crate::commands::CommandError;
use crate::domain::{SUPPORTED_IMAGE_EXTENSIONS, get_file_info};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

/// Both dialog strings come from the frontend: interface text is translated
/// there, and the backend carries none.
#[tauri::command]
pub async fn select_image_files(
    app_handle: AppHandle,
    title: String,
    filter_label: String,
) -> Result<Vec<String>, CommandError> {
    let files = app_handle
        .dialog()
        .file()
        .add_filter(filter_label, SUPPORTED_IMAGE_EXTENSIONS)
        .set_title(title)
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
pub async fn get_file_information(file_path: String) -> Result<FileInfo, CommandError> {
    let path = Path::new(&file_path);
    let metadata = get_file_info(path)?;

    Ok(FileInfo {
        path: file_path,
        name: metadata.name,
        size: metadata.size,
        extension: metadata.extension,
        is_image: metadata.is_image,
    })
}

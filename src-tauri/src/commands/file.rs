use crate::commands::CommandError;
use crate::domain::{SUPPORTED_IMAGE_EXTENSIONS, ScanOutcome, collect_image_paths, get_file_info};
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

/// Native folder picker. The title comes from the frontend (interface text is
/// translated there). Returns the chosen folder, or `None` if the user cancels.
#[tauri::command]
pub async fn select_folder(
    app_handle: AppHandle,
    title: String,
) -> Result<Option<String>, CommandError> {
    let folder = app_handle
        .dialog()
        .file()
        .set_title(title)
        .blocking_pick_folder();

    Ok(folder
        .and_then(|picked| picked.into_path().ok())
        .map(|path| path.to_string_lossy().to_string()))
}

/// Expand dropped or picked paths (a mix of files and folders) into the flat,
/// sorted list of supported image files. The single filtering authority for
/// input — the frontend passes raw paths and never inspects extensions itself.
/// The recursive walk is filesystem I/O, so it runs on the blocking pool.
#[tauri::command]
pub async fn scan_paths_for_images(paths: Vec<String>) -> Result<ScanOutcome, CommandError> {
    tauri::async_runtime::spawn_blocking(move || collect_image_paths(&paths))
        .await
        .map_err(|e| CommandError::internal(format!("scan task failed: {e}")))
}

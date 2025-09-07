use crate::domain::{copy_file, get_file_info, read_image_file, validate_image_file, AppState};
use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::{AppHandle, State};

/// Commande pour ouvrir le dialog de sélection de fichiers
#[tauri::command]
pub async fn select_image_files(
    _app_handle: AppHandle,
    _state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    use rfd::FileDialog;

    let files = FileDialog::new()
        .add_filter("Images", &["png", "jpg", "jpeg", "webp"])
        .set_title("Sélectionner des images")
        .pick_files();

    match files {
        Some(paths) => {
            let path_strings: Vec<String> = paths
                .into_iter()
                .map(|p| p.to_string_lossy().to_string())
                .collect();
            Ok(path_strings)
        }
        None => Ok(vec![]), // User cancelled
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

/// Commande pour générer un preview base64 à partir d'un chemin de fichier
#[tauri::command]
pub async fn generate_preview(
    file_path: String,
    _state: State<'_, AppState>,
) -> Result<String, String> {
    let path = Path::new(&file_path);

    // Validate it's an image first
    validate_image_file(path).map_err(|e| format!("File validation failed: {}", e))?;

    // Read image data
    let image_data = read_image_file(path).map_err(|e| format!("Failed to read image: {}", e))?;

    // For preview, we can resize if needed (simplified - just return base64 for now)
    let base64_data = general_purpose::STANDARD.encode(&image_data);

    // Get the MIME type from extension
    let mime_type = match path.extension().and_then(|ext| ext.to_str()) {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("webp") => "image/webp",
        _ => "image/png", // fallback
    };

    Ok(format!("data:{};base64,{}", mime_type, base64_data))
}

/// Commande pour sauvegarder un fichier dans le dossier Downloads
#[tauri::command]
pub async fn save_to_downloads(
    file_path: String,
    _state: State<'_, AppState>,
) -> Result<String, String> {
    let source_path = Path::new(&file_path);

    // Get Downloads directory
    let downloads_dir =
        dirs::download_dir().ok_or_else(|| "Could not find Downloads directory".to_string())?;

    // Get file name
    let file_name = source_path
        .file_name()
        .ok_or_else(|| "Invalid file path".to_string())?;

    let target_path = downloads_dir.join(file_name);

    // Make unique if file already exists
    let unique_target = crate::domain::PathUtils::make_unique_filename(&target_path);

    // Copy file
    copy_file(source_path, &unique_target)
        .map_err(|e| format!("Failed to copy file to Downloads: {}", e))?;

    Ok(unique_target.to_string_lossy().to_string())
}

/// Commande pour sauvegarder tous les fichiers dans le dossier Downloads
#[tauri::command]
pub async fn save_all_to_downloads(
    file_paths: Vec<String>,
    _state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let mut saved_paths = Vec::new();

    for file_path in file_paths {
        match save_to_downloads(file_path, _state.clone()).await {
            Ok(saved_path) => saved_paths.push(saved_path),
            Err(e) => {
                // Log error but continue with other files
                eprintln!("Failed to save file: {}", e);
            }
        }
    }

    if saved_paths.is_empty() {
        Err("No files could be saved".to_string())
    } else {
        Ok(saved_paths)
    }
}

/// Commande pour nettoyer les fichiers temporaires de l'application
#[tauri::command]
pub async fn clear_app_temporary_files(_state: State<'_, AppState>) -> Result<(), String> {
    // Get temp directory
    let temp_dir = std::env::temp_dir().join("plume");

    if !temp_dir.exists() {
        return Ok(());
    }

    // Clean up files with "dropped" or "plume" prefix
    let cleaned_files = crate::domain::cleanup_temp_files(&temp_dir, "dropped")
        .map_err(|e| format!("Failed to cleanup temp files: {}", e))?;

    let more_cleaned = crate::domain::cleanup_temp_files(&temp_dir, "plume")
        .map_err(|e| format!("Failed to cleanup temp files: {}", e))?;

    let total_cleaned = cleaned_files.len() + more_cleaned.len();
    println!("Cleaned {} temporary files", total_cleaned);

    Ok(())
}

/// Get file information
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

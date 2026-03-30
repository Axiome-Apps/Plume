use crate::domain::{get_file_info, read_image_file, validate_image_file, AppState};
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
        .add_filter("Images", &["png", "jpg", "jpeg", "webp", "heic", "heif"])
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

    let ext = path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    // HEIC needs decoding to PNG for preview
    if ext == "heic" || ext == "heif" {
        let heic_img = crate::domain::compression::engine::decode_heic_public(&image_data)
            .map_err(|e| format!("Failed to decode HEIC for preview: {}", e))?;

        let mut png_buf = std::io::Cursor::new(Vec::new());
        heic_img
            .write_to(&mut png_buf, image::ImageFormat::Png)
            .map_err(|e| format!("Failed to encode HEIC preview as PNG: {}", e))?;

        let base64_data = general_purpose::STANDARD.encode(png_buf.into_inner());
        return Ok(format!("data:image/png;base64,{}", base64_data));
    }

    // For other formats, return raw base64
    let base64_data = general_purpose::STANDARD.encode(&image_data);

    let mime_type = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        _ => "image/png",
    };

    Ok(format!("data:{};base64,{}", mime_type, base64_data))
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

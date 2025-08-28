use crate::domain::entities::DroppedFile;
use base64::{engine::general_purpose, Engine as _};
use std::path::{Path, PathBuf};

#[derive(Debug, thiserror::Error)]
pub enum FileServiceError {
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Invalid file path: {0}")]
    InvalidPath(String),
    #[error("Unsupported file type: {0}")]
    UnsupportedFileType(String),
    #[error("Downloads directory not found")]
    DownloadsNotFound,
}

pub type FileResult<T> = Result<T, FileServiceError>;

pub struct FileService;

impl FileService {
    /// Sauvegarde temporairement les fichiers droppés
    pub async fn save_dropped_files(files: Vec<DroppedFile>) -> FileResult<Vec<String>> {
        use std::env;
        use std::fs;

        let temp_dir = env::temp_dir().join("plume_dropped");
        if !temp_dir.exists() {
            fs::create_dir_all(&temp_dir)?;
        }

        let mut saved_paths = Vec::new();

        for file in files {
            if !file.is_image() {
                continue; // Skip non-image files
            }

            let file_path = temp_dir.join(&file.name);
            fs::write(&file_path, &file.data)?;
            saved_paths.push(file_path.to_string_lossy().to_string());
        }

        Ok(saved_paths)
    }

    /// Génère un preview base64 à partir d'un chemin de fichier
    pub async fn generate_preview(file_path: &str) -> FileResult<String> {
        let path = Path::new(file_path);

        if !path.exists() {
            return Err(FileServiceError::InvalidPath(file_path.to_string()));
        }

        let file_data = std::fs::read(path)?;
        let mime_type = Self::get_mime_type(path);
        let base64_data = general_purpose::STANDARD.encode(&file_data);

        Ok(format!("data:{};base64,{}", mime_type, base64_data))
    }

    /// Sauvegarde un fichier dans le dossier Downloads
    pub async fn save_to_downloads(file_path: &str) -> FileResult<String> {
        let source_path = Path::new(file_path);

        if !source_path.exists() {
            return Err(FileServiceError::InvalidPath(file_path.to_string()));
        }

        let downloads_dir = dirs::download_dir().ok_or(FileServiceError::DownloadsNotFound)?;

        let file_name = source_path
            .file_name()
            .ok_or_else(|| FileServiceError::InvalidPath("Invalid filename".to_string()))?;

        let dest_path = downloads_dir.join(file_name);

        std::fs::copy(source_path, &dest_path)?;

        Ok(dest_path.to_string_lossy().to_string())
    }

    /// Sauvegarde plusieurs fichiers dans le dossier Downloads
    pub async fn save_all_to_downloads(file_paths: Vec<String>) -> FileResult<Vec<String>> {
        let mut saved_paths = Vec::new();

        for file_path in file_paths {
            match Self::save_to_downloads(&file_path).await {
                Ok(saved_path) => saved_paths.push(saved_path),
                Err(e) => return Err(e),
            }
        }

        Ok(saved_paths)
    }

    /// Nettoie les fichiers temporaires
    pub async fn cleanup_temp_files() -> FileResult<()> {
        let temp_dir = std::env::temp_dir().join("plume_dropped");

        if temp_dir.exists() {
            std::fs::remove_dir_all(&temp_dir)?;
        }

        Ok(())
    }

    /// Détermine le type MIME basé sur l'extension du fichier
    fn get_mime_type(path: &Path) -> &'static str {
        match path.extension().and_then(|ext| ext.to_str()) {
            Some(ext) => match ext.to_lowercase().as_str() {
                "png" => "image/png",
                "jpg" | "jpeg" => "image/jpeg",
                "webp" => "image/webp",
                _ => "image/png", // fallback
            },
            None => "image/png",
        }
    }

    /// Valide qu'un fichier est une image supportée
    pub fn is_supported_image(path: &Path) -> bool {
        match path.extension().and_then(|ext| ext.to_str()) {
            Some(ext) => matches!(ext.to_lowercase().as_str(), "png" | "jpg" | "jpeg" | "webp"),
            None => false,
        }
    }

    /// Génère un nom de fichier unique si il existe déjà
    pub fn generate_unique_filename(base_path: &Path) -> PathBuf {
        if !base_path.exists() {
            return base_path.to_path_buf();
        }

        let parent = base_path.parent().unwrap_or_else(|| Path::new("."));
        let stem = base_path.file_stem().unwrap_or_default();
        let extension = base_path.extension().unwrap_or_default();

        for i in 1..1000 {
            let new_name = if extension.is_empty() {
                format!("{}_{}", stem.to_string_lossy(), i)
            } else {
                format!(
                    "{}_{}. {}",
                    stem.to_string_lossy(),
                    i,
                    extension.to_string_lossy()
                )
            };

            let new_path = parent.join(new_name);
            if !new_path.exists() {
                return new_path;
            }
        }

        // Fallback avec timestamp
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        if extension.is_empty() {
            parent.join(format!("{}_{}", stem.to_string_lossy(), timestamp))
        } else {
            parent.join(format!(
                "{}_{}. {}",
                stem.to_string_lossy(),
                timestamp,
                extension.to_string_lossy()
            ))
        }
    }
}

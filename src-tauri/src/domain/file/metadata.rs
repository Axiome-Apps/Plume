use crate::domain::file::error::{FileError, FileResult};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// File metadata information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub path: String,
    pub name: String,
    pub extension: Option<String>,
    pub size: u64,
    pub is_image: bool,
    pub mime_type: Option<String>,
    pub modified: Option<String>, // ISO 8601 timestamp
    pub created: Option<String>,  // ISO 8601 timestamp
}

impl FileMetadata {
    /// Create metadata from a file path
    pub fn from_path<P: AsRef<Path>>(path: P) -> FileResult<Self> {
        let path_ref = path.as_ref();
        let metadata = std::fs::metadata(path_ref)?;

        let name = path_ref
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| FileError::InvalidPath("Cannot extract file name".to_string()))?
            .to_string();

        let extension = path_ref
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|s| s.to_lowercase());

        let is_image = extension
            .as_ref()
            .map(|ext| {
                matches!(
                    ext.as_str(),
                    "jpg" | "jpeg" | "png" | "webp" | "gif" | "bmp" | "tiff"
                )
            })
            .unwrap_or(false);

        let mime_type = extension.as_ref().map(|ext| get_mime_type(ext));

        let modified = metadata.modified().ok().and_then(|time| {
            time.duration_since(std::time::UNIX_EPOCH)
                .ok()
                .map(|duration| {
                    chrono::DateTime::<chrono::Utc>::from_timestamp(duration.as_secs() as i64, 0)
                        .map(|dt| dt.to_rfc3339())
                        .unwrap_or_default()
                })
        });

        let created = metadata.created().ok().and_then(|time| {
            time.duration_since(std::time::UNIX_EPOCH)
                .ok()
                .map(|duration| {
                    chrono::DateTime::<chrono::Utc>::from_timestamp(duration.as_secs() as i64, 0)
                        .map(|dt| dt.to_rfc3339())
                        .unwrap_or_default()
                })
        });

        Ok(FileMetadata {
            path: path_ref.to_string_lossy().to_string(),
            name,
            extension,
            size: metadata.len(),
            is_image,
            mime_type,
            modified,
            created,
        })
    }

    /// Check if file is a supported image format
    pub fn is_supported_image(&self) -> bool {
        self.is_image
            && self
                .extension
                .as_ref()
                .map(|ext| matches!(ext.as_str(), "jpg" | "jpeg" | "png" | "webp"))
                .unwrap_or(false)
    }

    /// Get human-readable file size
    pub fn human_readable_size(&self) -> String {
        format_file_size(self.size)
    }
}

/// Get MIME type for file extension
fn get_mime_type(extension: &str) -> String {
    match extension {
        "jpg" | "jpeg" => "image/jpeg".to_string(),
        "png" => "image/png".to_string(),
        "webp" => "image/webp".to_string(),
        "gif" => "image/gif".to_string(),
        "bmp" => "image/bmp".to_string(),
        "tiff" => "image/tiff".to_string(),
        _ => "application/octet-stream".to_string(),
    }
}

/// Format file size in human-readable format
pub fn format_file_size(size: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    const THRESHOLD: u64 = 1024;

    if size == 0 {
        return "0 B".to_string();
    }

    let mut size_f = size as f64;
    let mut unit_index = 0;

    while size_f >= THRESHOLD as f64 && unit_index < UNITS.len() - 1 {
        size_f /= THRESHOLD as f64;
        unit_index += 1;
    }

    if unit_index == 0 {
        format!("{} {}", size, UNITS[unit_index])
    } else {
        format!("{:.1} {}", size_f, UNITS[unit_index])
    }
}

/// Get file extension from path
pub fn get_file_extension<P: AsRef<Path>>(path: P) -> Option<String> {
    path.as_ref()
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase())
}

/// Check if path is a supported image file
pub fn is_supported_image_file<P: AsRef<Path>>(path: P) -> bool {
    get_file_extension(path)
        .map(|ext| matches!(ext.as_str(), "jpg" | "jpeg" | "png" | "webp"))
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_file_size() {
        assert_eq!(format_file_size(0), "0 B");
        assert_eq!(format_file_size(512), "512 B");
        assert_eq!(format_file_size(1024), "1.0 KB");
        assert_eq!(format_file_size(1536), "1.5 KB");
        assert_eq!(format_file_size(1048576), "1.0 MB");
        assert_eq!(format_file_size(1073741824), "1.0 GB");
    }

    #[test]
    fn test_get_file_extension() {
        assert_eq!(get_file_extension("test.jpg"), Some("jpg".to_string()));
        assert_eq!(get_file_extension("test.PNG"), Some("png".to_string()));
        assert_eq!(get_file_extension("test"), None);
        assert_eq!(get_file_extension("test.tar.gz"), Some("gz".to_string()));
    }

    #[test]
    fn test_is_supported_image_file() {
        assert!(is_supported_image_file("test.jpg"));
        assert!(is_supported_image_file("test.PNG"));
        assert!(is_supported_image_file("test.webp"));
        assert!(!is_supported_image_file("test.gif"));
        assert!(!is_supported_image_file("test.txt"));
        assert!(!is_supported_image_file("test"));
    }

    #[test]
    fn test_get_mime_type() {
        assert_eq!(get_mime_type("jpg"), "image/jpeg");
        assert_eq!(get_mime_type("png"), "image/png");
        assert_eq!(get_mime_type("webp"), "image/webp");
        assert_eq!(get_mime_type("unknown"), "application/octet-stream");
    }
}

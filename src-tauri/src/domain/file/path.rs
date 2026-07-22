use crate::domain::file::error::{FileError, FileResult};
use std::path::{Path, PathBuf};

/// Path utilities and validation
pub struct PathUtils;

impl PathUtils {
    /// Validate that a path is safe (no traversal attacks)
    pub fn validate_safe_path<P: AsRef<Path>>(path: P) -> FileResult<()> {
        let path_ref = path.as_ref();

        // Check for path traversal attempts
        if path_ref.to_string_lossy().contains("..") {
            return Err(FileError::SecurityViolation(
                "Path traversal detected".to_string(),
            ));
        }

        // Check for absolute paths outside allowed directories
        if path_ref.is_absolute() {
            // Allow temp directory paths for file processing
            let temp_dir = std::env::temp_dir();
            let downloads_dir = dirs::download_dir();
            let home_dir = dirs::home_dir();
            let desktop_dir = dirs::desktop_dir();
            let pictures_dir = dirs::picture_dir();

            let is_temp = path_ref.starts_with(&temp_dir);
            let is_downloads = downloads_dir.is_some_and(|d| path_ref.starts_with(d));
            let is_home = home_dir.is_some_and(|d| path_ref.starts_with(d));
            let is_desktop = desktop_dir.is_some_and(|d| path_ref.starts_with(d));
            let is_pictures = pictures_dir.is_some_and(|d| path_ref.starts_with(d));
            // Allow external volumes (macOS: /Volumes/, Linux: /media/, /mnt/)
            let is_external_volume = path_ref.starts_with("/Volumes/")
                || path_ref.starts_with("/media/")
                || path_ref.starts_with("/mnt/");

            // Allow access to user directories and external volumes for reading image files
            if !is_temp
                && !is_downloads
                && !is_home
                && !is_desktop
                && !is_pictures
                && !is_external_volume
            {
                return Err(FileError::SecurityViolation(
                    "Absolute paths not allowed".to_string(),
                ));
            }
        }

        Ok(())
    }

    /// Get the parent directory of a path
    pub fn get_parent_dir<P: AsRef<Path>>(path: P) -> FileResult<PathBuf> {
        path.as_ref()
            .parent()
            .map(|p| p.to_path_buf())
            .ok_or_else(|| FileError::InvalidPath("No parent directory".to_string()))
    }

    /// Ensure directory exists, creating it if necessary
    pub fn ensure_dir_exists<P: AsRef<Path>>(path: P) -> FileResult<()> {
        let path_ref = path.as_ref();

        if !path_ref.exists() {
            std::fs::create_dir_all(path_ref)?;
        } else if !path_ref.is_dir() {
            return Err(FileError::InvalidPath(
                "Path exists but is not a directory".to_string(),
            ));
        }

        Ok(())
    }

    /// Get file name without extension
    pub fn get_file_stem<P: AsRef<Path>>(path: P) -> FileResult<String> {
        path.as_ref()
            .file_stem()
            .and_then(|s| s.to_str())
            .map(|s| s.to_string())
            .ok_or_else(|| FileError::InvalidPath("Cannot extract file stem".to_string()))
    }

    /// Join paths safely
    pub fn safe_join<P: AsRef<Path>, Q: AsRef<Path>>(base: P, relative: Q) -> FileResult<PathBuf> {
        let relative_path = relative.as_ref();

        // Validate the relative path
        Self::validate_safe_path(relative_path)?;

        Ok(base.as_ref().join(relative_path))
    }

    /// Change file extension
    pub fn change_extension<P: AsRef<Path>>(path: P, new_extension: &str) -> PathBuf {
        let path_ref = path.as_ref();
        let stem = path_ref
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("file");

        let parent = path_ref.parent().unwrap_or(Path::new("."));

        if new_extension.is_empty() {
            parent.join(stem)
        } else {
            let ext = if new_extension.starts_with('.') {
                new_extension.to_string()
            } else {
                format!(".{}", new_extension)
            };
            parent.join(format!("{}{}", stem, ext))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_safe_path() {
        // Relative paths are safe
        assert!(PathUtils::validate_safe_path("safe/path.jpg").is_ok());
        // Traversal is blocked
        assert!(PathUtils::validate_safe_path("../unsafe/path.jpg").is_err());
        // System paths are blocked
        assert!(PathUtils::validate_safe_path("/etc/passwd").is_err());
    }

    #[test]
    fn test_validate_safe_path_allowed_directories() {
        // Home directory should be allowed
        if let Some(home) = dirs::home_dir() {
            let home_path = home.join("Documents/photo.jpg");
            assert!(PathUtils::validate_safe_path(&home_path).is_ok());
        }
        // External volumes should be allowed (macOS)
        assert!(PathUtils::validate_safe_path("/Volumes/USB/photo.jpg").is_ok());
        assert!(PathUtils::validate_safe_path("/media/usb/photo.jpg").is_ok());
        // System paths remain blocked
        assert!(PathUtils::validate_safe_path("/usr/bin/test").is_err());
    }

    #[test]
    fn test_change_extension() {
        assert_eq!(
            PathUtils::change_extension("test.jpg", "webp"),
            PathBuf::from("test.webp")
        );
        assert_eq!(
            PathUtils::change_extension("path/test.png", ".jpg"),
            PathBuf::from("path/test.jpg")
        );
    }

    #[test]
    fn test_get_file_stem() {
        assert_eq!(PathUtils::get_file_stem("test.jpg").unwrap(), "test");
        assert_eq!(PathUtils::get_file_stem("path/test.png").unwrap(), "test");
        assert_eq!(
            PathUtils::get_file_stem("no_extension").unwrap(),
            "no_extension"
        );
    }

}

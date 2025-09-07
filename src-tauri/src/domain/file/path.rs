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
            let is_downloads = downloads_dir.map_or(false, |d| path_ref.starts_with(d));
            let is_home = home_dir.map_or(false, |d| path_ref.starts_with(d));
            let is_desktop = desktop_dir.map_or(false, |d| path_ref.starts_with(d));
            let is_pictures = pictures_dir.map_or(false, |d| path_ref.starts_with(d));

            // Allow access to user directories for reading image files
            if !is_temp && !is_downloads && !is_home && !is_desktop && !is_pictures {
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

    /// Create a unique file name if the original exists
    pub fn make_unique_filename<P: AsRef<Path>>(path: P) -> PathBuf {
        let path_ref = path.as_ref();

        if !path_ref.exists() {
            return path_ref.to_path_buf();
        }

        let stem = path_ref
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("file");

        let extension = path_ref
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| format!(".{}", s))
            .unwrap_or_default();

        let parent = path_ref.parent().unwrap_or(Path::new("."));

        for i in 1..=9999 {
            let new_name = format!("{} ({}){}", stem, i, extension);
            let new_path = parent.join(new_name);

            if !new_path.exists() {
                return new_path;
            }
        }

        // Fallback with timestamp
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let new_name = format!("{}_{}_{}", stem, timestamp, extension);
        parent.join(new_name)
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

/// Generate output path for compressed file
pub fn generate_output_path<P: AsRef<Path>>(
    input_path: P,
    output_extension: &str,
    output_dir: Option<P>,
) -> FileResult<PathBuf> {
    let input_path_ref = input_path.as_ref();

    let base_dir = if let Some(dir) = output_dir {
        dir.as_ref().to_path_buf()
    } else {
        PathUtils::get_parent_dir(input_path_ref)?
    };

    let stem = PathUtils::get_file_stem(input_path_ref)?;
    let output_name = if output_extension.starts_with('.') {
        format!("{}{}", stem, output_extension)
    } else {
        format!("{}.{}", stem, output_extension)
    };

    let output_path = base_dir.join(output_name);
    Ok(PathUtils::make_unique_filename(output_path))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_validate_safe_path() {
        assert!(PathUtils::validate_safe_path("safe/path.jpg").is_ok());
        assert!(PathUtils::validate_safe_path("../unsafe/path.jpg").is_err());
        assert!(PathUtils::validate_safe_path("/absolute/path.jpg").is_err());
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
    fn test_make_unique_filename() {
        let temp_dir = TempDir::new().unwrap();
        let test_path = temp_dir.path().join("test.txt");

        // First call should return the original path
        assert_eq!(PathUtils::make_unique_filename(&test_path), test_path);

        // Create the file, now it should generate a unique name
        fs::write(&test_path, "content").unwrap();
        let unique_path = PathUtils::make_unique_filename(&test_path);
        assert_ne!(unique_path, test_path);
        assert!(unique_path.to_string_lossy().contains("test (1).txt"));
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

    #[test]
    fn test_generate_output_path() {
        let input = "input/test.png";
        let result = generate_output_path(input, "webp", None::<&str>).unwrap();
        assert_eq!(result, PathBuf::from("input/test.webp"));

        let result_with_dot = generate_output_path(input, ".jpg", None::<&str>).unwrap();
        assert_eq!(result_with_dot, PathBuf::from("input/test.jpg"));
    }
}

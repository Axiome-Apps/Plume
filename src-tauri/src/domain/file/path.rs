use crate::domain::file::error::{FileError, FileResult};
use std::path::{Path, PathBuf};

/// Validate that a path is safe (no traversal attacks)
pub fn validate_safe_path<P: AsRef<Path>>(path: P) -> FileResult<()> {
    let path_ref = path.as_ref();

    // Check for path traversal attempts
    if path_ref.to_string_lossy().contains("..") {
        return Err(FileError::SecurityViolation(
            "Path traversal detected".to_string(),
        ));
    }

    // Absolute paths must sit under one of the allowed roots
    if path_ref.is_absolute()
        && !allowed_roots()
            .iter()
            .any(|root| path_ref.starts_with(root))
    {
        return Err(FileError::SecurityViolation(
            "Absolute paths not allowed".to_string(),
        ));
    }

    Ok(())
}

/// Single source of truth for the filesystem allow-list: the absolute
/// directory roots the app may read from and write to.
///
/// The asset-protocol scope in `tauri.conf.json`
/// (`app.security.assetProtocol.scope`) mirrors this list — keep both in
/// sync when editing.
fn allowed_roots() -> Vec<PathBuf> {
    let mut roots = vec![std::env::temp_dir()];
    roots.extend(dirs::download_dir());
    roots.extend(dirs::home_dir());
    roots.extend(dirs::desktop_dir());
    roots.extend(dirs::picture_dir());
    // External volumes (macOS /Volumes, Linux /media and /mnt)
    roots.push(PathBuf::from("/Volumes"));
    roots.push(PathBuf::from("/media"));
    roots.push(PathBuf::from("/mnt"));
    roots
}

/// Get file name without extension
pub fn get_file_stem<P: AsRef<Path>>(path: P) -> FileResult<String> {
    path.as_ref()
        .file_stem()
        .and_then(|s| s.to_str())
        .map(std::string::ToString::to_string)
        .ok_or_else(|| FileError::InvalidPath("Cannot extract file stem".to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_safe_path() {
        // Relative paths are safe
        assert!(validate_safe_path("safe/path.jpg").is_ok());
        // Traversal is blocked
        assert!(validate_safe_path("../unsafe/path.jpg").is_err());
        // System paths are blocked
        assert!(validate_safe_path("/etc/passwd").is_err());
    }

    #[test]
    fn test_validate_safe_path_allowed_directories() {
        // Home directory should be allowed
        if let Some(home) = dirs::home_dir() {
            let home_path = home.join("Documents/photo.jpg");
            assert!(validate_safe_path(&home_path).is_ok());
        }
        // External volumes should be allowed (macOS)
        assert!(validate_safe_path("/Volumes/USB/photo.jpg").is_ok());
        assert!(validate_safe_path("/media/usb/photo.jpg").is_ok());
        // System paths remain blocked
        assert!(validate_safe_path("/usr/bin/test").is_err());
    }

    #[test]
    fn test_get_file_stem() {
        assert_eq!(get_file_stem("test.jpg").unwrap(), "test");
        assert_eq!(get_file_stem("path/test.png").unwrap(), "test");
        assert_eq!(get_file_stem("no_extension").unwrap(), "no_extension");
    }
}

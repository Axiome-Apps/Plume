use crate::domain::shared::error::{DomainError, DomainResult};
use std::path::Path;

/// Path utilities and validation
pub mod path {
    use super::*;

    /// Normalize file extension (remove dot, convert to lowercase)
    pub fn normalize_extension(ext: &str) -> String {
        ext.to_lowercase().trim_start_matches('.').to_string()
    }

    /// Check if path is safe (no traversal attacks)
    pub fn is_safe_path<P: AsRef<Path>>(path: P) -> bool {
        let path_ref = path.as_ref();
        let path_str = path_ref.to_string_lossy();

        // Check for path traversal attempts
        if path_str.contains("..") || path_str.contains("~") {
            return false;
        }

        // Check for null bytes (security issue)
        if path_str.contains('\0') {
            return false;
        }

        // Check for dangerous absolute paths
        if path_str.starts_with("/etc")
            || path_str.starts_with("/proc")
            || path_str.starts_with("/sys")
            || path_str.starts_with("/dev")
        {
            return false;
        }

        true
    }

    /// Validate path depth to prevent deeply nested path attacks
    pub fn validate_path_depth<P: AsRef<Path>>(path: P, max_depth: u32) -> DomainResult<()> {
        let depth = path.as_ref().components().count() as u32;
        if depth > max_depth {
            return Err(DomainError::InvalidInput(format!(
                "Path depth {} exceeds maximum allowed depth {}",
                depth, max_depth
            )));
        }
        Ok(())
    }

    /// Get file extension safely
    pub fn get_extension<P: AsRef<Path>>(path: P) -> Option<String> {
        path.as_ref()
            .extension()
            .and_then(|ext| ext.to_str())
            .map(normalize_extension)
    }

    /// Check if path has allowed extension
    pub fn has_allowed_extension<P: AsRef<Path>>(path: P, allowed_extensions: &[String]) -> bool {
        if let Some(ext) = get_extension(path) {
            allowed_extensions
                .iter()
                .any(|allowed| allowed.to_lowercase() == ext)
        } else {
            false
        }
    }
}

/// File size utilities
pub mod size {
    /// Format file size in human-readable format
    pub fn format_bytes(bytes: u64) -> String {
        const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB", "PB"];
        const THRESHOLD: f64 = 1024.0;

        if bytes == 0 {
            return "0 B".to_string();
        }

        let mut size = bytes as f64;
        let mut unit_index = 0;

        while size >= THRESHOLD && unit_index < UNITS.len() - 1 {
            size /= THRESHOLD;
            unit_index += 1;
        }

        if unit_index == 0 {
            format!("{} {}", bytes, UNITS[0])
        } else {
            format!("{:.1} {}", size, UNITS[unit_index])
        }
    }

    /// Calculate percentage reduction between two sizes
    pub fn calculate_savings_percent(original: u64, compressed: u64) -> f64 {
        if original == 0 {
            return 0.0;
        }
        if compressed > original {
            return 0.0; // No savings if compressed is larger
        }
        ((original - compressed) as f64 / original as f64) * 100.0
    }

    /// Calculate compression ratio (compressed / original)
    pub fn calculate_compression_ratio(original: u64, compressed: u64) -> f64 {
        if original == 0 {
            return 0.0;
        }
        compressed as f64 / original as f64
    }

    /// Parse human-readable size string to bytes
    pub fn parse_size_string(size_str: &str) -> crate::domain::DomainResult<u64> {
        let size_str = size_str.trim().to_uppercase();

        if size_str.is_empty() {
            return Err(crate::domain::DomainError::InvalidInput(
                "Empty size string".to_string(),
            ));
        }

        // Extract number and unit
        let (number_part, unit_part) = if let Some(pos) = size_str.find(char::is_alphabetic) {
            (&size_str[..pos], &size_str[pos..])
        } else {
            // No unit, assume bytes
            (size_str.as_str(), "B")
        };

        let number: f64 = number_part.trim().parse().map_err(|_| {
            crate::domain::DomainError::InvalidInput(format!(
                "Invalid number in size string: {}",
                number_part
            ))
        })?;

        if number < 0.0 {
            return Err(crate::domain::DomainError::InvalidInput(
                "Size cannot be negative".to_string(),
            ));
        }

        let multiplier = match unit_part.trim() {
            "B" => 1,
            "KB" => 1024,
            "MB" => 1024 * 1024,
            "GB" => 1024 * 1024 * 1024,
            "TB" => 1024_u64.pow(4),
            "PB" => 1024_u64.pow(5),
            _ => {
                return Err(crate::domain::DomainError::InvalidInput(format!(
                    "Unknown unit: {}",
                    unit_part
                )))
            }
        };

        Ok((number * multiplier as f64) as u64)
    }
}

/// String utilities
pub mod string {
    use super::*;

    /// Sanitize filename by removing dangerous characters
    pub fn sanitize_filename(filename: &str) -> String {
        filename
            .chars()
            .map(|c| match c {
                // Replace dangerous characters with underscore
                '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
                // Remove control characters
                c if c.is_control() => '_',
                // Keep other characters
                c => c,
            })
            .collect::<String>()
            .trim()
            .to_string()
    }

    /// Truncate string to maximum length with ellipsis
    pub fn truncate_with_ellipsis(s: &str, max_len: usize) -> String {
        if s.len() <= max_len {
            s.to_string()
        } else if max_len <= 3 {
            "...".to_string()
        } else {
            format!("{}...", &s[..max_len - 3])
        }
    }

    /// Generate safe temporary filename
    pub fn generate_temp_filename(prefix: &str, extension: &str) -> String {
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S_%3f");
        let sanitized_prefix = sanitize_filename(prefix);
        let sanitized_ext = path::normalize_extension(extension);

        format!("{}_{}.{}", sanitized_prefix, timestamp, sanitized_ext)
    }

    /// Extract base filename without extension
    pub fn get_base_filename<P: AsRef<Path>>(path: P) -> Option<String> {
        path.as_ref()
            .file_stem()
            .and_then(|stem| stem.to_str())
            .map(|s| s.to_string())
    }
}

/// Time utilities
pub mod time {
    /// Format duration in milliseconds to human-readable string
    pub fn format_duration_ms(ms: u64) -> String {
        if ms < 1000 {
            format!("{}ms", ms)
        } else if ms < 60000 {
            format!("{:.1}s", ms as f64 / 1000.0)
        } else if ms < 3600000 {
            let minutes = ms / 60000;
            let seconds = (ms % 60000) / 1000;
            format!("{}m {}s", minutes, seconds)
        } else {
            let hours = ms / 3600000;
            let minutes = (ms % 3600000) / 60000;
            format!("{}h {}m", hours, minutes)
        }
    }

    /// Get current timestamp as ISO 8601 string
    pub fn current_timestamp() -> String {
        chrono::Utc::now().to_rfc3339()
    }

    /// Parse ISO 8601 timestamp
    pub fn parse_timestamp(
        timestamp: &str,
    ) -> Result<chrono::DateTime<chrono::Utc>, chrono::ParseError> {
        chrono::DateTime::parse_from_rfc3339(timestamp).map(|dt| dt.with_timezone(&chrono::Utc))
    }
}

/// Hash utilities
pub mod hash {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    /// Calculate simple hash of data
    pub fn simple_hash(data: &[u8]) -> u64 {
        let mut hasher = DefaultHasher::new();
        data.hash(&mut hasher);
        hasher.finish()
    }

    /// Generate content-based ID from data
    pub fn content_id(data: &[u8]) -> String {
        format!("content_{:x}", simple_hash(data))
    }

    /// Check if two byte arrays have the same content
    pub fn content_equal(data1: &[u8], data2: &[u8]) -> bool {
        data1.len() == data2.len() && data1 == data2
    }
}

/// Validation utilities
pub mod validation {
    use super::{path, DomainError, DomainResult};

    /// Validate image dimensions
    pub fn validate_dimensions(
        width: u32,
        height: u32,
        max_width: u32,
        max_height: u32,
    ) -> DomainResult<()> {
        if width == 0 || height == 0 {
            return Err(DomainError::InvalidInput(
                "Dimensions cannot be zero".to_string(),
            ));
        }

        if width > max_width || height > max_height {
            return Err(DomainError::InvalidInput(format!(
                "Dimensions {}x{} exceed maximum {}x{}",
                width, height, max_width, max_height
            )));
        }

        Ok(())
    }

    /// Validate quality value (1-100)
    pub fn validate_quality(quality: u8) -> DomainResult<()> {
        if !(1..=100).contains(&quality) {
            return Err(DomainError::InvalidInput(format!(
                "Quality {} must be between 1 and 100",
                quality
            )));
        }
        Ok(())
    }

    /// Validate file format
    pub fn validate_format(format: &str, supported_formats: &[String]) -> DomainResult<()> {
        let normalized = path::normalize_extension(format);

        if !supported_formats
            .iter()
            .any(|fmt| fmt.to_lowercase() == normalized)
        {
            return Err(DomainError::InvalidInput(format!(
                "Unsupported format: {}",
                format
            )));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_extension() {
        assert_eq!(path::normalize_extension(".PNG"), "png");
        assert_eq!(path::normalize_extension("JPEG"), "jpeg");
        assert_eq!(path::normalize_extension(".jpg"), "jpg");
    }

    #[test]
    fn test_is_safe_path() {
        assert!(path::is_safe_path("safe/file.jpg"));
        assert!(path::is_safe_path("./file.jpg"));

        assert!(!path::is_safe_path("../unsafe.jpg"));
        assert!(!path::is_safe_path("~/file.jpg"));
        assert!(!path::is_safe_path("/etc/passwd"));
        assert!(!path::is_safe_path("file\0.jpg")); // null byte
    }

    #[test]
    fn test_format_bytes() {
        assert_eq!(size::format_bytes(0), "0 B");
        assert_eq!(size::format_bytes(512), "512 B");
        assert_eq!(size::format_bytes(1024), "1.0 KB");
        assert_eq!(size::format_bytes(1536), "1.5 KB");
        assert_eq!(size::format_bytes(1048576), "1.0 MB");
        assert_eq!(size::format_bytes(1073741824), "1.0 GB");
    }

    #[test]
    fn test_calculate_savings_percent() {
        assert_eq!(size::calculate_savings_percent(1000, 500), 50.0);
        assert_eq!(size::calculate_savings_percent(1000, 0), 100.0);
        assert_eq!(size::calculate_savings_percent(1000, 1000), 0.0);
        assert_eq!(size::calculate_savings_percent(0, 500), 0.0);
        assert_eq!(size::calculate_savings_percent(1000, 1500), 0.0); // No savings if larger
    }

    #[test]
    fn test_parse_size_string() {
        assert_eq!(size::parse_size_string("1024").unwrap(), 1024);
        assert_eq!(size::parse_size_string("1KB").unwrap(), 1024);
        assert_eq!(size::parse_size_string("1 MB").unwrap(), 1048576);
        assert_eq!(size::parse_size_string("1.5 GB").unwrap(), 1610612736);

        assert!(size::parse_size_string("invalid").is_err());
        assert!(size::parse_size_string("-100").is_err());
        assert!(size::parse_size_string("1 XB").is_err());
    }

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(string::sanitize_filename("safe_file.jpg"), "safe_file.jpg");
        assert_eq!(
            string::sanitize_filename("unsafe<>file.jpg"),
            "unsafe__file.jpg"
        );
        assert_eq!(
            string::sanitize_filename("file:with|bad?chars"),
            "file_with_bad_chars"
        );
    }

    #[test]
    fn test_truncate_with_ellipsis() {
        assert_eq!(string::truncate_with_ellipsis("short", 10), "short");
        assert_eq!(
            string::truncate_with_ellipsis("this is a long string", 10),
            "this is..."
        );
        assert_eq!(string::truncate_with_ellipsis("abc", 2), "...");
    }

    #[test]
    fn test_generate_temp_filename() {
        let filename = string::generate_temp_filename("test", "jpg");
        assert!(filename.starts_with("test_"));
        assert!(filename.ends_with(".jpg"));

        let filename2 = string::generate_temp_filename("test", "jpg");
        assert_ne!(filename, filename2); // Should be unique
    }

    #[test]
    fn test_format_duration_ms() {
        assert_eq!(time::format_duration_ms(500), "500ms");
        assert_eq!(time::format_duration_ms(1500), "1.5s");
        assert_eq!(time::format_duration_ms(65000), "1m 5s");
        assert_eq!(time::format_duration_ms(3661000), "1h 1m");
    }

    #[test]
    fn test_content_hash() {
        let data1 = b"hello world";
        let data2 = b"hello world";
        let data3 = b"different data";

        assert_eq!(hash::simple_hash(data1), hash::simple_hash(data2));
        assert_ne!(hash::simple_hash(data1), hash::simple_hash(data3));

        assert!(hash::content_equal(data1, data2));
        assert!(!hash::content_equal(data1, data3));

        let id1 = hash::content_id(data1);
        let id2 = hash::content_id(data2);
        assert_eq!(id1, id2);
        assert!(id1.starts_with("content_"));
    }

    #[test]
    fn test_validation() {
        // Dimensions
        assert!(validation::validate_dimensions(100, 100, 200, 200).is_ok());
        assert!(validation::validate_dimensions(0, 100, 200, 200).is_err());
        assert!(validation::validate_dimensions(300, 100, 200, 200).is_err());

        // Quality
        assert!(validation::validate_quality(80).is_ok());
        assert!(validation::validate_quality(0).is_err());
        assert!(validation::validate_quality(101).is_err());

        // Format
        let supported = vec!["jpg".to_string(), "png".to_string()];
        assert!(validation::validate_format("jpg", &supported).is_ok());
        assert!(validation::validate_format("PNG", &supported).is_ok());
        assert!(validation::validate_format("gif", &supported).is_err());
    }

    #[test]
    fn test_path_depth_validation() {
        assert!(path::validate_path_depth("file.jpg", 10).is_ok());
        assert!(path::validate_path_depth("dir/file.jpg", 10).is_ok());

        let deep_path = "a/".repeat(15) + "file.jpg";
        assert!(path::validate_path_depth(&deep_path, 10).is_err());
    }
}

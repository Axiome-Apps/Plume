use crate::domain::shared::error::{DomainError, DomainResult};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub temp_dir: String,
    pub max_file_size: u64,
    pub supported_formats: Vec<String>,
    pub cleanup_interval_hours: u32,
    pub compression: CompressionConfig,
    pub performance: PerformanceConfig,
    pub security: SecurityConfig,
}

/// Compression-specific configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionConfig {
    pub default_quality: u8,
    pub enable_lossless_fallback: bool,
    pub max_dimensions: (u32, u32),
    pub preserve_metadata: bool,
    pub auto_optimize: bool,
}

/// Performance configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceConfig {
    pub max_concurrent_operations: usize,
    pub memory_limit_mb: u64,
    pub disk_cache_size_mb: u64,
    pub enable_gpu_acceleration: bool,
}

/// Security configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub allowed_paths: Vec<String>,
    pub blocked_paths: Vec<String>,
    pub max_path_depth: u32,
    pub enable_sandbox: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            temp_dir: get_default_temp_dir(),
            max_file_size: 100 * 1024 * 1024, // 100MB
            supported_formats: vec![
                "png".to_string(),
                "jpg".to_string(),
                "jpeg".to_string(),
                "webp".to_string(),
            ],
            cleanup_interval_hours: 24,
            compression: CompressionConfig::default(),
            performance: PerformanceConfig::default(),
            security: SecurityConfig::default(),
        }
    }
}

impl Default for CompressionConfig {
    fn default() -> Self {
        Self {
            default_quality: 80,
            enable_lossless_fallback: true,
            max_dimensions: (4096, 4096),
            preserve_metadata: false,
            auto_optimize: true,
        }
    }
}

impl Default for PerformanceConfig {
    fn default() -> Self {
        Self {
            max_concurrent_operations: num_cpus::get().max(4),
            memory_limit_mb: 1024,          // 1GB
            disk_cache_size_mb: 512,        // 512MB
            enable_gpu_acceleration: false, // Conservative default
        }
    }
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            allowed_paths: vec![
                "~/Desktop".to_string(),
                "~/Documents".to_string(),
                "~/Downloads".to_string(),
                "~/Pictures".to_string(),
            ],
            blocked_paths: vec![
                "/etc".to_string(),
                "/proc".to_string(),
                "/sys".to_string(),
                "/dev".to_string(),
            ],
            max_path_depth: 20,
            enable_sandbox: true,
        }
    }
}

impl AppConfig {
    /// Load configuration from file
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> DomainResult<Self> {
        let content = std::fs::read_to_string(&path).map_err(|e| {
            DomainError::Configuration(format!("Failed to read config file: {}", e))
        })?;

        let config: AppConfig = serde_json::from_str(&content)
            .map_err(|e| DomainError::Configuration(format!("Failed to parse config: {}", e)))?;

        config.validate()?;
        Ok(config)
    }

    /// Save configuration to file
    pub fn save_to_file<P: AsRef<Path>>(&self, path: P) -> DomainResult<()> {
        self.validate()?;

        let content = serde_json::to_string_pretty(self).map_err(|e| {
            DomainError::Configuration(format!("Failed to serialize config: {}", e))
        })?;

        // Ensure parent directory exists
        if let Some(parent) = path.as_ref().parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                DomainError::Configuration(format!("Failed to create config directory: {}", e))
            })?;
        }

        std::fs::write(&path, content).map_err(|e| {
            DomainError::Configuration(format!("Failed to write config file: {}", e))
        })?;

        Ok(())
    }

    /// Validate configuration
    pub fn validate(&self) -> DomainResult<()> {
        // Validate temp directory
        if self.temp_dir.is_empty() {
            return Err(DomainError::Configuration(
                "Temp directory cannot be empty".to_string(),
            ));
        }

        // Validate file size limit
        if self.max_file_size == 0 {
            return Err(DomainError::Configuration(
                "Max file size must be greater than 0".to_string(),
            ));
        }

        // Validate supported formats
        if self.supported_formats.is_empty() {
            return Err(DomainError::Configuration(
                "At least one supported format must be specified".to_string(),
            ));
        }

        // Validate compression config
        self.compression.validate()?;
        self.performance.validate()?;
        self.security.validate()?;

        Ok(())
    }

    /// Get temporary directory path
    pub fn get_temp_path(&self) -> PathBuf {
        PathBuf::from(&self.temp_dir)
    }

    /// Check if file size is within limits
    pub fn is_file_size_allowed(&self, size: u64) -> bool {
        size <= self.max_file_size
    }

    /// Check if format is supported
    pub fn is_format_supported(&self, format: &str) -> bool {
        let normalized = format.to_lowercase();
        self.supported_formats
            .iter()
            .any(|fmt| fmt.to_lowercase() == normalized)
    }

    /// Get merged configuration from default + file + environment
    pub fn load_with_overrides<P: AsRef<Path>>(config_path: Option<P>) -> DomainResult<Self> {
        let mut config = Self::default();

        // Load from file if provided
        if let Some(path) = config_path {
            if path.as_ref().exists() {
                config = Self::load_from_file(path)?;
            }
        }

        // Apply environment variable overrides
        config.apply_env_overrides();

        config.validate()?;
        Ok(config)
    }

    /// Apply environment variable overrides
    fn apply_env_overrides(&mut self) {
        if let Ok(temp_dir) = std::env::var("PLUME_TEMP_DIR") {
            self.temp_dir = temp_dir;
        }

        if let Ok(max_size) = std::env::var("PLUME_MAX_FILE_SIZE") {
            if let Ok(size) = max_size.parse::<u64>() {
                self.max_file_size = size;
            }
        }

        if let Ok(quality) = std::env::var("PLUME_DEFAULT_QUALITY") {
            if let Ok(q) = quality.parse::<u8>() {
                self.compression.default_quality = q.clamp(1, 100);
            }
        }
    }
}

impl CompressionConfig {
    fn validate(&self) -> DomainResult<()> {
        if !(1..=100).contains(&self.default_quality) {
            return Err(DomainError::Configuration(
                "Default quality must be between 1 and 100".to_string(),
            ));
        }

        if self.max_dimensions.0 == 0 || self.max_dimensions.1 == 0 {
            return Err(DomainError::Configuration(
                "Max dimensions must be greater than 0".to_string(),
            ));
        }

        Ok(())
    }
}

impl PerformanceConfig {
    fn validate(&self) -> DomainResult<()> {
        if self.max_concurrent_operations == 0 {
            return Err(DomainError::Configuration(
                "Max concurrent operations must be greater than 0".to_string(),
            ));
        }

        if self.memory_limit_mb == 0 {
            return Err(DomainError::Configuration(
                "Memory limit must be greater than 0".to_string(),
            ));
        }

        Ok(())
    }
}

impl SecurityConfig {
    fn validate(&self) -> DomainResult<()> {
        if self.max_path_depth == 0 {
            return Err(DomainError::Configuration(
                "Max path depth must be greater than 0".to_string(),
            ));
        }

        Ok(())
    }
}

/// Get default temporary directory based on OS
fn get_default_temp_dir() -> String {
    std::env::temp_dir()
        .join("plume")
        .to_string_lossy()
        .to_string()
}

/// Configuration manager for runtime config access
pub struct ConfigManager {
    config: AppConfig,
}

impl ConfigManager {
    /// Create new config manager with default config
    pub fn new() -> Self {
        Self {
            config: AppConfig::default(),
        }
    }

    /// Create config manager from file
    pub fn from_file<P: AsRef<Path>>(path: P) -> DomainResult<Self> {
        let config = AppConfig::load_from_file(path)?;
        Ok(Self { config })
    }

    /// Get current configuration (immutable reference)
    pub fn get_config(&self) -> &AppConfig {
        &self.config
    }

    /// Update configuration
    pub fn update_config(&mut self, new_config: AppConfig) -> DomainResult<()> {
        new_config.validate()?;
        self.config = new_config;
        Ok(())
    }

    /// Hot reload configuration from file
    pub fn reload_from_file<P: AsRef<Path>>(&mut self, path: P) -> DomainResult<()> {
        let new_config = AppConfig::load_from_file(path)?;
        self.config = new_config;
        Ok(())
    }
}

impl Default for ConfigManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert!(config.validate().is_ok());
        assert!(!config.temp_dir.is_empty());
        assert!(config.max_file_size > 0);
        assert!(!config.supported_formats.is_empty());
    }

    #[test]
    fn test_config_validation() {
        let mut config = AppConfig::default();

        // Valid config should pass
        assert!(config.validate().is_ok());

        // Invalid temp dir
        config.temp_dir = String::new();
        assert!(config.validate().is_err());
        config.temp_dir = "valid".to_string();

        // Invalid file size
        config.max_file_size = 0;
        assert!(config.validate().is_err());
        config.max_file_size = 1024;

        // Invalid supported formats
        config.supported_formats.clear();
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_format_support() {
        let config = AppConfig::default();

        assert!(config.is_format_supported("png"));
        assert!(config.is_format_supported("PNG"));
        assert!(config.is_format_supported("jpg"));
        assert!(!config.is_format_supported("tiff"));
    }

    #[test]
    fn test_file_size_limits() {
        let config = AppConfig::default();

        assert!(config.is_file_size_allowed(1024));
        assert!(config.is_file_size_allowed(config.max_file_size));
        assert!(!config.is_file_size_allowed(config.max_file_size + 1));
    }

    #[test]
    fn test_config_save_load() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("config.json");

        let original_config = AppConfig::default();

        // Save config
        assert!(original_config.save_to_file(&config_path).is_ok());

        // Load config
        let loaded_config = AppConfig::load_from_file(&config_path).unwrap();

        // Compare (using JSON serialization since AppConfig doesn't implement PartialEq)
        let original_json = serde_json::to_string(&original_config).unwrap();
        let loaded_json = serde_json::to_string(&loaded_config).unwrap();
        assert_eq!(original_json, loaded_json);
    }

    #[test]
    fn test_config_manager() {
        let mut manager = ConfigManager::new();

        // Get config
        let config = manager.get_config();
        assert!(config.validate().is_ok());

        // Update config
        let new_config = AppConfig {
            max_file_size: 2048,
            ..Default::default()
        };

        assert!(manager.update_config(new_config).is_ok());
        assert_eq!(manager.get_config().max_file_size, 2048);

        // Try to update with invalid config
        let invalid_config = AppConfig {
            max_file_size: 0,
            ..Default::default()
        };

        assert!(manager.update_config(invalid_config).is_err());
        // Should still have the previous valid config
        assert_eq!(manager.get_config().max_file_size, 2048);
    }
}

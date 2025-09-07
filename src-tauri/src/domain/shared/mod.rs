// Shared Domain - Common Types and Utilities
//
// This module provides shared types, utilities, and cross-cutting concerns used
// across all domains, following Rust idioms for modularity and reusability.

pub mod config;
pub mod error;
pub mod events;
pub mod utils;

// Re-export core types and functions for easy access
pub use config::{AppConfig, CompressionConfig, ConfigManager, PerformanceConfig, SecurityConfig};
pub use error::{get_recovery_strategy, DomainError, DomainResult, ErrorRecovery};
pub use events::{
    compression_completed_event,
    compression_failed_event,
    error_event,
    // Convenience event creators
    file_processed_event,
    info_event,
    ConsoleEventListener,
    DomainEvent,
    EventBus,
    EventListener,
    EventPayload,
    EventSeverity,
    EventType,
};

// Re-export commonly used utilities with shorter paths
pub use utils::hash::{content_equal, content_id, simple_hash};
pub use utils::path::{get_extension, is_safe_path, normalize_extension, validate_path_depth};
pub use utils::size::{calculate_compression_ratio, calculate_savings_percent, format_bytes};
pub use utils::string::{generate_temp_filename, sanitize_filename, truncate_with_ellipsis};
pub use utils::time::{current_timestamp, format_duration_ms};
pub use utils::validation::{validate_dimensions, validate_format, validate_quality};

// Legacy compatibility - maintain old function names
/// @deprecated Use utils::size::format_bytes instead
pub fn format_file_size(bytes: u64) -> String {
    utils::size::format_bytes(bytes)
}

// Application lifecycle utilities

/// Initialize shared domain resources and return AppState
pub fn initialize() -> DomainResult<AppState> {
    // Perform any necessary initialization
    log::info!("Initializing shared domain");
    Ok(AppState::new())
}

/// Cleanup shared domain resources
pub fn cleanup() -> DomainResult<()> {
    // Perform cleanup tasks
    log::info!("Cleaning up shared domain resources");
    Ok(())
}

/// Get application version information
pub fn get_version_info() -> VersionInfo {
    VersionInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        build_date: option_env!("BUILD_DATE").unwrap_or("unknown").to_string(),
        git_commit: option_env!("GIT_COMMIT").unwrap_or("unknown").to_string(),
    }
}

/// Application version information
#[derive(Debug, Clone)]
pub struct VersionInfo {
    pub version: String,
    pub build_date: String,
    pub git_commit: String,
}

impl std::fmt::Display for VersionInfo {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "v{} (built {} from {})",
            self.version,
            self.build_date,
            &self.git_commit[..8.min(self.git_commit.len())]
        )
    }
}

// Global application state (if needed)
use std::sync::{Arc, RwLock};

/// Shared application state
pub struct AppState {
    pub config: Arc<RwLock<AppConfig>>,
    pub event_bus: Arc<RwLock<EventBus>>,
}

impl AppState {
    /// Create new application state with default configuration
    pub fn new() -> Self {
        Self {
            config: Arc::new(RwLock::new(AppConfig::default())),
            event_bus: Arc::new(RwLock::new(EventBus::new())),
        }
    }

    /// Create application state with custom configuration
    pub fn with_config(config: AppConfig) -> Self {
        Self {
            config: Arc::new(RwLock::new(config)),
            event_bus: Arc::new(RwLock::new(EventBus::new())),
        }
    }

    /// Get configuration (read-only)
    pub fn get_config(&self) -> std::sync::RwLockReadGuard<AppConfig> {
        self.config.read().unwrap()
    }

    /// Update configuration
    pub fn update_config<F>(&self, updater: F) -> DomainResult<()>
    where
        F: FnOnce(&mut AppConfig) -> DomainResult<()>,
    {
        let mut config = self.config.write().unwrap();
        updater(&mut config)?;
        config.validate()?;
        Ok(())
    }

    /// Publish event to event bus
    pub fn publish_event(&self, event: DomainEvent) -> DomainResult<()> {
        let mut event_bus = self.event_bus.write().unwrap();
        event_bus.publish(event)
    }

    /// Get recent events
    pub fn get_recent_events(&self, limit: usize) -> Vec<DomainEvent> {
        let event_bus = self.event_bus.read().unwrap();
        event_bus.get_recent_events(limit).to_vec()
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    fn test_shared_utilities_integration() {
        // Test path utilities
        assert!(is_safe_path("safe/path/file.jpg"));
        assert!(!is_safe_path("../unsafe/path"));

        // Test size utilities
        assert_eq!(format_bytes(1024), "1.0 KB");
        assert_eq!(calculate_savings_percent(1000, 500), 50.0);

        // Test string utilities
        assert_eq!(sanitize_filename("file<>name.jpg"), "file__name.jpg");

        // Test validation
        assert!(validate_quality(80).is_ok());
        assert!(validate_quality(0).is_err());
    }

    #[test]
    fn test_app_state() {
        let state = AppState::new();

        // Test config access
        let config = state.get_config();
        assert!(!config.temp_dir.is_empty());
        drop(config);

        // Test config update
        let result = state.update_config(|config| {
            config.max_file_size = 2048;
            Ok(())
        });
        assert!(result.is_ok());

        let config = state.get_config();
        assert_eq!(config.max_file_size, 2048);
        drop(config);

        // Test event publishing
        let event = info_event("test".to_string(), "message".to_string());
        assert!(state.publish_event(event).is_ok());

        let recent_events = state.get_recent_events(10);
        assert_eq!(recent_events.len(), 1);
    }

    #[test]
    fn test_error_conversion_chain() {
        // Test that domain errors can be converted from all sub-domains
        let file_error = crate::domain::file::FileError::NotFound("test.jpg".to_string());
        let domain_error: DomainError = file_error.into();
        assert!(matches!(domain_error, DomainError::NotFound(_)));

        // Test recovery strategy
        let strategy = get_recovery_strategy(&domain_error);
        assert!(matches!(strategy, ErrorRecovery::Abort));
    }

    #[test]
    fn test_version_info() {
        let version = get_version_info();
        assert!(!version.version.is_empty());

        let display = format!("{}", version);
        assert!(display.starts_with("v"));
        assert!(display.contains("built"));
        assert!(display.contains("from"));
    }
}

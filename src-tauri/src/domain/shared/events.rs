use crate::domain::shared::error::DomainResult;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Domain events for observability and event-driven behavior
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainEvent {
    pub id: String,
    pub event_type: EventType,
    pub timestamp: String, // ISO 8601 format
    pub payload: EventPayload,
    pub metadata: HashMap<String, String>,
}

/// Types of domain events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventType {
    FileProcessed,
    CompressionStarted,
    CompressionCompleted,
    CompressionFailed,
    StatisticRecorded,
    TempFilesCleanedUp,
    ConfigurationChanged,
    Error,
    Warning,
    Info,
}

/// Event payload containing specific data for each event type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventPayload {
    FileProcessed {
        path: String,
        size: u64,
        format: String,
        processing_time_ms: u64,
    },
    CompressionStarted {
        input_format: String,
        output_format: String,
        input_size: u64,
        quality: u8,
    },
    CompressionCompleted {
        input_format: String,
        output_format: String,
        original_size: u64,
        compressed_size: u64,
        savings_percent: f64,
        processing_time_ms: u64,
    },
    CompressionFailed {
        input_format: String,
        error_message: String,
        input_size: u64,
    },
    StatisticRecorded {
        format_conversion: String,
        sample_id: i64,
    },
    TempFilesCleanedUp {
        count: u32,
        total_size_freed: u64,
    },
    ConfigurationChanged {
        setting_name: String,
        old_value: String,
        new_value: String,
    },
    Error {
        operation: String,
        error_type: String,
        error_message: String,
    },
    Warning {
        operation: String,
        warning_message: String,
    },
    Info {
        operation: String,
        info_message: String,
    },
}

impl DomainEvent {
    /// Create a new domain event with current timestamp
    pub fn new(event_type: EventType, payload: EventPayload) -> Self {
        Self {
            id: generate_event_id(),
            event_type,
            timestamp: chrono::Utc::now().to_rfc3339(),
            payload,
            metadata: HashMap::new(),
        }
    }

    /// Add metadata to the event
    pub fn with_metadata(mut self, key: String, value: String) -> Self {
        self.metadata.insert(key, value);
        self
    }

    /// Add multiple metadata entries
    pub fn with_metadata_map(mut self, metadata: HashMap<String, String>) -> Self {
        self.metadata.extend(metadata);
        self
    }

    /// Get event severity level
    pub fn severity(&self) -> EventSeverity {
        match self.event_type {
            EventType::Error => EventSeverity::Error,
            EventType::Warning => EventSeverity::Warning,
            EventType::CompressionFailed => EventSeverity::Warning,
            EventType::Info => EventSeverity::Info,
            _ => EventSeverity::Debug,
        }
    }

    /// Check if this is a success event
    pub fn is_success(&self) -> bool {
        matches!(
            self.event_type,
            EventType::FileProcessed
                | EventType::CompressionCompleted
                | EventType::StatisticRecorded
                | EventType::TempFilesCleanedUp
        )
    }

    /// Check if this is an error event
    pub fn is_error(&self) -> bool {
        matches!(
            self.event_type,
            EventType::Error | EventType::CompressionFailed
        )
    }
}

/// Event severity levels
#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub enum EventSeverity {
    Debug,
    Info,
    Warning,
    Error,
}

/// Event listener trait for handling domain events
pub trait EventListener: Send + Sync {
    fn handle_event(&self, event: &DomainEvent) -> DomainResult<()>;
    fn can_handle(&self, event_type: &EventType) -> bool;
}

/// Event bus for distributing events to listeners
pub struct EventBus {
    listeners: Vec<Box<dyn EventListener>>,
    event_history: Vec<DomainEvent>,
    max_history_size: usize,
}

impl EventBus {
    /// Create new event bus
    pub fn new() -> Self {
        Self {
            listeners: Vec::new(),
            event_history: Vec::new(),
            max_history_size: 1000,
        }
    }

    /// Add event listener
    pub fn add_listener(&mut self, listener: Box<dyn EventListener>) {
        self.listeners.push(listener);
    }

    /// Publish event to all interested listeners
    pub fn publish(&mut self, event: DomainEvent) -> DomainResult<()> {
        // Store in history
        self.event_history.push(event.clone());

        // Trim history if needed
        if self.event_history.len() > self.max_history_size {
            self.event_history.remove(0);
        }

        // Notify listeners
        for listener in &self.listeners {
            if listener.can_handle(&event.event_type) {
                if let Err(e) = listener.handle_event(&event) {
                    // Log error but don't fail the publish
                    eprintln!("Error in event listener: {}", e);
                }
            }
        }

        Ok(())
    }

    /// Get recent events
    pub fn get_recent_events(&self, limit: usize) -> &[DomainEvent] {
        let start = if self.event_history.len() > limit {
            self.event_history.len() - limit
        } else {
            0
        };
        &self.event_history[start..]
    }

    /// Get events by type
    pub fn get_events_by_type(&self, event_type: &EventType) -> Vec<&DomainEvent> {
        self.event_history
            .iter()
            .filter(|event| {
                std::mem::discriminant(&event.event_type) == std::mem::discriminant(event_type)
            })
            .collect()
    }

    /// Get error events
    pub fn get_error_events(&self) -> Vec<&DomainEvent> {
        self.event_history
            .iter()
            .filter(|event| event.is_error())
            .collect()
    }

    /// Clear event history
    pub fn clear_history(&mut self) {
        self.event_history.clear();
    }

    /// Set maximum history size
    pub fn set_max_history_size(&mut self, size: usize) {
        self.max_history_size = size;

        // Trim existing history if needed
        if self.event_history.len() > size {
            let excess = self.event_history.len() - size;
            self.event_history.drain(0..excess);
        }
    }
}

impl Default for EventBus {
    fn default() -> Self {
        Self::new()
    }
}

/// Generate unique event ID
fn generate_event_id() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static COUNTER: AtomicU64 = AtomicU64::new(0);

    let timestamp = chrono::Utc::now().timestamp_millis();
    let counter = COUNTER.fetch_add(1, Ordering::SeqCst);

    format!("evt_{}_{}", timestamp, counter)
}

/// Convenience functions for creating common events
pub fn file_processed_event(
    path: String,
    size: u64,
    format: String,
    processing_time_ms: u64,
) -> DomainEvent {
    DomainEvent::new(
        EventType::FileProcessed,
        EventPayload::FileProcessed {
            path,
            size,
            format,
            processing_time_ms,
        },
    )
}

pub fn compression_completed_event(
    input_format: String,
    output_format: String,
    original_size: u64,
    compressed_size: u64,
    savings_percent: f64,
    processing_time_ms: u64,
) -> DomainEvent {
    DomainEvent::new(
        EventType::CompressionCompleted,
        EventPayload::CompressionCompleted {
            input_format,
            output_format,
            original_size,
            compressed_size,
            savings_percent,
            processing_time_ms,
        },
    )
}

pub fn compression_failed_event(
    input_format: String,
    error_message: String,
    input_size: u64,
) -> DomainEvent {
    DomainEvent::new(
        EventType::CompressionFailed,
        EventPayload::CompressionFailed {
            input_format,
            error_message,
            input_size,
        },
    )
}

pub fn error_event(operation: String, error_type: String, error_message: String) -> DomainEvent {
    DomainEvent::new(
        EventType::Error,
        EventPayload::Error {
            operation,
            error_type,
            error_message,
        },
    )
}

pub fn info_event(operation: String, info_message: String) -> DomainEvent {
    DomainEvent::new(
        EventType::Info,
        EventPayload::Info {
            operation,
            info_message,
        },
    )
}

/// Simple console event listener for debugging
pub struct ConsoleEventListener {
    min_severity: EventSeverity,
}

impl ConsoleEventListener {
    pub fn new(min_severity: EventSeverity) -> Self {
        Self { min_severity }
    }
}

impl EventListener for ConsoleEventListener {
    fn handle_event(&self, event: &DomainEvent) -> DomainResult<()> {
        if event.severity() >= self.min_severity {
            let timestamp = event
                .timestamp
                .split('T')
                .nth(1)
                .and_then(|t| t.split('.').next())
                .unwrap_or("--:--:--");

            println!(
                "[{}] {:?} - {:?}",
                timestamp, event.event_type, event.payload
            );
        }
        Ok(())
    }

    fn can_handle(&self, _event_type: &EventType) -> bool {
        true // Console listener handles all events
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_creation() {
        let event = file_processed_event("test.jpg".to_string(), 1024, "jpeg".to_string(), 150);

        assert!(!event.id.is_empty());
        assert!(matches!(event.event_type, EventType::FileProcessed));
        assert!(event.is_success());
        assert!(!event.is_error());

        match event.payload {
            EventPayload::FileProcessed {
                path,
                size,
                format,
                processing_time_ms,
            } => {
                assert_eq!(path, "test.jpg");
                assert_eq!(size, 1024);
                assert_eq!(format, "jpeg");
                assert_eq!(processing_time_ms, 150);
            }
            _ => panic!("Expected FileProcessed payload"),
        }
    }

    #[test]
    fn test_event_metadata() {
        let event = info_event("test".to_string(), "test message".to_string())
            .with_metadata("user_id".to_string(), "123".to_string())
            .with_metadata("session".to_string(), "abc".to_string());

        assert_eq!(event.metadata.get("user_id"), Some(&"123".to_string()));
        assert_eq!(event.metadata.get("session"), Some(&"abc".to_string()));
    }

    #[test]
    fn test_event_severity() {
        let info_event = info_event("op".to_string(), "msg".to_string());
        assert_eq!(info_event.severity(), EventSeverity::Info);

        let error_event = error_event("op".to_string(), "type".to_string(), "msg".to_string());
        assert_eq!(error_event.severity(), EventSeverity::Error);

        let compression_event = compression_completed_event(
            "png".to_string(),
            "webp".to_string(),
            1000,
            500,
            50.0,
            100,
        );
        assert_eq!(compression_event.severity(), EventSeverity::Debug);
    }

    #[test]
    fn test_event_bus() {
        let mut bus = EventBus::new();

        // Add console listener
        let listener = Box::new(ConsoleEventListener::new(EventSeverity::Info));
        bus.add_listener(listener);

        // Publish events
        let event1 = info_event("op1".to_string(), "msg1".to_string());
        let event2 = error_event("op2".to_string(), "type".to_string(), "msg2".to_string());

        assert!(bus.publish(event1.clone()).is_ok());
        assert!(bus.publish(event2.clone()).is_ok());

        // Check history
        let recent = bus.get_recent_events(10);
        assert_eq!(recent.len(), 2);
        assert_eq!(recent[0].id, event1.id);
        assert_eq!(recent[1].id, event2.id);

        // Check error events
        let errors = bus.get_error_events();
        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0].id, event2.id);
    }

    #[test]
    fn test_event_bus_history_limit() {
        let mut bus = EventBus::new();
        bus.set_max_history_size(3);

        // Add 5 events
        for i in 0..5 {
            let event = info_event(format!("op{}", i), format!("msg{}", i));
            bus.publish(event).unwrap();
        }

        // Should only keep last 3
        let recent = bus.get_recent_events(10);
        assert_eq!(recent.len(), 3);

        // Should be events 2, 3, 4
        match &recent[0].payload {
            EventPayload::Info { operation, .. } => assert_eq!(operation, "op2"),
            _ => panic!("Expected info payload"),
        }
    }

    #[test]
    fn test_generate_event_id() {
        let id1 = generate_event_id();
        let id2 = generate_event_id();

        assert!(!id1.is_empty());
        assert!(!id2.is_empty());
        assert_ne!(id1, id2);
        assert!(id1.starts_with("evt_"));
        assert!(id2.starts_with("evt_"));
    }
}

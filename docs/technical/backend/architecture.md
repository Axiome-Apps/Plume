# Backend Architecture

## Overview

The Plume backend is built with **Rust** and follows a **functional architecture** with clean separation of concerns. The system emphasizes pure functions, immutable data structures, and zero-cost abstractions.

## Architecture Principles

### Functional Design

- **Pure functions** over object-oriented patterns
- **Immutable data structures** for thread safety
- **Composition** over inheritance
- **Error handling** with Result types

### Domain-Driven Structure

```
src-tauri/src/
├── main.rs              # Application entry point
├── lib.rs              # Library exports
├── commands/           # Tauri command handlers
│   ├── compression.rs  # Image compression commands
│   ├── database.rs     # Database operations
│   ├── file.rs         # File system operations
│   └── stats.rs        # Statistics commands
├── database/           # Database layer
│   ├── connection.rs   # SQLite connection management
│   ├── migrations.rs   # Database schema migrations
│   └── models.rs       # Data models
└── domain/             # Core business logic
    ├── compression/    # Compression domain
    ├── file/          # File handling domain
    ├── image/         # Image processing domain
    └── shared/        # Shared utilities
```

## Core Components

### Command Layer

Handles communication between frontend and backend through Tauri commands.

```rust
#[tauri::command]
pub async fn compress_image(
    request: CompressImageRequest,
    image_id: Option<String>,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<CompressImageResponse, String>
```

### Domain Layer

Contains pure business logic with no external dependencies.

```rust
// Example: Compression domain
pub fn compress_file_to_file(
    input_path: &Path,
    output_path: &Path,
    settings: &CompressionSettings,
) -> CompressionResult<CompressionOutput>
```

### Database Layer

SQLite-based persistence with connection pooling and migrations.

```rust
pub struct DatabaseManager {
    db_path: PathBuf,
    connection: Mutex<Option<Connection>>,
}
```

## Key Features

### Multi-format Compression

- **PNG**: oxipng for lossless optimization
- **WebP**: libwebp for modern web formats
- **JPEG**: mozjpeg for high-quality compression

### Progress Tracking

Real-time compression progress with event emission:

```rust
let _ = app_handle.emit("compression-progress", CompressionProgressEvent {
    image_id: image_id.clone(),
    stage: CompressionStage::Processing,
    progress: 25.0,
});
```

### Statistics & Learning

SQLite database tracks compression results for intelligent predictions:

```sql
CREATE TABLE compression_stats (
    id INTEGER PRIMARY KEY,
    input_format TEXT NOT NULL,
    output_format TEXT NOT NULL,
    original_size INTEGER NOT NULL,
    compressed_size INTEGER NOT NULL,
    compression_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Error Handling

Comprehensive error handling with custom error types:

```rust
#[derive(Debug, thiserror::Error)]
pub enum CompressionError {
    #[error("IO error: {0}")]
    IoError(String),

    #[error("Unsupported format: {0}")]
    UnsupportedFormat(String),

    #[error("Processing error: {0}")]
    ProcessingError(String),
}
```

## Performance Considerations

### Memory Management

- **Streaming processing** for large files
- **Automatic cleanup** of temporary resources
- **Memory pools** for frequent allocations

### Concurrency

- **Multi-threaded compression** with oxipng
- **Async/await** for I/O operations
- **Channel-based communication** for progress updates

### Optimization

- **Zero-copy** data handling where possible
- **SIMD optimizations** in compression libraries
- **Lazy loading** of resources

## Testing Strategy

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compression_settings_validation() {
        let settings = CompressionSettings::new(80, OutputFormat::WebP);
        assert!(settings.is_valid());
    }
}
```

### Integration Tests

- End-to-end compression workflows
- Database operations and migrations
- Cross-platform file handling

## Security

### File Validation

- **Format verification** before processing
- **Size limits** to prevent resource exhaustion
- **Path sanitization** for file operations

### Sandboxing

- Tauri security context isolation
- Limited file system access
- No network permissions required

## Future Enhancements

### Planned Improvements

- **Plugin system** for custom compressors
- **GPU acceleration** for supported formats
- **Distributed processing** for large batches
- **Advanced metadata** preservation

### Performance Targets

- Startup time: < 100ms
- Memory usage: < 100MB baseline
- Compression throughput: > 10MB/s

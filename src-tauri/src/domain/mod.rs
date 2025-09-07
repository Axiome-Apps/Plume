// Domain modules with functional architecture
pub mod compression;
pub mod file;
pub mod image;
pub mod shared;

// Re-export core types from each domain for easy access

// Compression domain exports
pub use compression::{
    calculate_confidence,
    compress_batch_files,
    // Core functions
    compress_file_to_file,
    create_compression_stat,
    create_prediction_query,
    create_stat,
    estimate_compression,
    get_size_range,
    high_quality_settings,
    max_compression_settings,
    // Convenience functions
    web_optimized_settings,
    CompressionError,
    CompressionOutput,
    CompressionPredictionService,
    CompressionResult,
    CompressionSettings,
    CompressionStat,
    EstimationQuery,
    EstimationResult,
    OutputFormat,
    SqliteStatsStore,
    StatsStore,
};

// Image domain exports
pub use image::{
    analyze_colors,
    analyze_compression_potential,
    // Convenience functions
    analyze_image,
    apply_sharpening,
    assess_image_quality,
    auto_crop,
    batch_process_images,
    classify_image_type,
    comprehensive_analysis,
    convert_color_space,
    // Core functions
    extract_metadata,
    get_compression_recommendations,
    optimize_for_web,
    prepare_for_web,
    resize_image,
    smart_resize,
    ColorAnalysis,
    ColorSpace,
    CompressionPotential,
    Dimensions,
    ImageError,
    ImageMetadata,
    ImageResult,
    ImageType,
    ProcessingParams,
    ProcessingResult,
    QualityAssessment,
    RiskLevel,
};

// File domain exports
pub use file::{
    batch_copy_files,
    cleanup_temp_files,
    copy_file,
    create_backup,
    delete_file,
    file_exists,
    format_file_size,
    // Path utilities
    generate_output_path,
    get_file_extension,
    get_file_info,
    get_temp_file_path,
    is_supported_image_file,
    move_file,
    process_image_files,
    // Core functions
    read_file,
    // Convenience functions
    read_image_file,
    validate_image_file,
    write_compressed_image,
    write_file,
    FileError,
    FileMetadata,
    FileOperation,
    FileResult,
    OperationType,
    PathUtils,
};

// Shared domain exports
pub use shared::{
    calculate_compression_ratio,
    calculate_savings_percent,
    cleanup,
    compression_completed_event,
    compression_failed_event,
    content_equal,
    content_id,
    current_timestamp,
    error_event,
    // Event creators
    file_processed_event,
    format_bytes,
    format_duration_ms,
    generate_temp_filename,
    get_extension,
    get_version_info,
    info_event,
    // App lifecycle
    initialize,
    is_safe_path,
    // Utility functions
    normalize_extension,
    sanitize_filename,
    simple_hash,
    truncate_with_ellipsis,
    validate_dimensions,
    validate_format,
    validate_path_depth,
    validate_quality,
    AppConfig,
    AppState,
    CompressionConfig,
    ConfigManager,
    ConsoleEventListener,
    DomainError,
    DomainEvent,
    DomainResult,
    ErrorRecovery,
    EventBus,
    EventListener,
    EventPayload,
    EventSeverity,
    EventType,
    PerformanceConfig,
    SecurityConfig,
    VersionInfo,
};

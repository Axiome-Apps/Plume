pub mod compression;
pub mod database;
pub mod file;
pub mod progress;
pub mod stats;

pub use compression::{compress_batch, compress_image};
pub use database::{
    get_compression_prediction, get_database_stats, init_database, record_compression_result,
    seed_compression_database, test_compression_prediction, test_database_connection,
};
pub use file::{
    clear_app_temporary_files, generate_preview, get_file_information, save_all_to_downloads,
    save_to_downloads, select_image_files,
};
pub use progress::{
    create_progress_config, get_default_compression_times, get_progress_estimation,
};
pub use stats::{
    get_compression_estimation, get_stats_count, get_stats_summary,
    record_compression_result_with_time, record_compression_stat, reset_compression_stats,
};

pub mod compression;
pub mod database;
pub mod file;
pub mod progress;
pub mod stats;

pub use compression::{compress_batch, compress_image};
pub use database::{
    get_compression_prediction, init_database, seed_compression_database,
    test_compression_prediction, test_database_connection,
};
pub use file::{
    clear_app_temporary_files, generate_preview, get_file_information, select_image_files,
};
#[allow(unused_imports)]
// get_progress_estimation used via tauri::generate_handler! — not visible to clippy
pub use stats::{
    get_compression_estimation, get_progress_estimation, get_stats_count, get_stats_summary,
    record_compression_stat, reset_compression_stats,
};

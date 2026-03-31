pub mod compression;
pub mod database;
pub mod file;
pub mod stats;

pub use compression::compress_image;
pub use database::init_database;
pub use file::{get_file_information, select_image_files};
pub use stats::{
    get_compression_estimation, get_progress_estimation, record_compression_stat,
    reset_compression_stats,
};

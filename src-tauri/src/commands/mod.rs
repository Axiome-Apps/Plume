pub mod compression;
pub mod database;
pub mod error;
pub mod file;
pub mod stats;

pub use error::CommandError;

pub use compression::{CompressionLimiter, compress_image};
pub use database::init_database;
pub use file::{get_file_information, select_image_files};
pub use stats::{get_compression_estimation, get_progress_estimation};

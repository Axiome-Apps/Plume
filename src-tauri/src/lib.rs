// Plume is a desktop application, not a published library: these pedantic lints
// target external-API ergonomics (doc sections, `#[must_use]` on every getter,
// backtick-wrapping identifiers in docs) that carry no value for an internal
// codebase with no downstream consumer. Accepted deviation → docs/conventions.md.
#![allow(clippy::missing_errors_doc)]
#![allow(clippy::must_use_candidate)]
#![allow(clippy::doc_markdown)]
// False positive from the `#[tauri::command]` expansion on `State<'_, T>` args:
// the generated wrapper reads an underscore-prefixed binding we never wrote.
#![allow(clippy::used_underscore_binding)]

mod commands;
pub mod database;
pub mod domain;

use tauri::Manager;

use commands::{
    CompressionLimiter, compress_image, get_compression_estimation, get_file_information,
    get_progress_estimation, init_database, scan_paths_for_images, select_folder,
    select_image_files,
};
use database::DatabaseManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let result = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // A single database handle is created once and shared as managed
            // state. Its internal Mutex serializes every access, so concurrent
            // commands can never collide on the SQLite file (no SQLITE_BUSY).
            let db = DatabaseManager::new(app.handle())?;
            db.connect()?;
            app.manage(db);

            // Shared permit pool bounding parallel compressions (see
            // CompressionLimiter). One pool for the whole app.
            app.manage(CompressionLimiter::new());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            compress_image,
            select_image_files,
            select_folder,
            scan_paths_for_images,
            get_file_information,
            get_compression_estimation,
            get_progress_estimation,
            init_database,
        ])
        .run(tauri::generate_context!());

    // A bootstrap failure is unrecoverable: no window, no runtime, nothing to
    // catch it downstream. Log the diagnostic at this top-level boundary and
    // abort with a non-zero status rather than panicking.
    if let Err(error) = result {
        log::error!("Fatal: failed to run the Tauri application: {error}");
        std::process::exit(1);
    }
}

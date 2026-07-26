use crate::domain::file::metadata::is_supported_extension;
use crate::domain::file::path::validate_safe_path;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Recursion backstop, platform-agnostic. Guards against cycles that the symlink
/// skip may miss — notably Windows junctions, which `is_symlink` does not always
/// report. No legitimate photo tree is this deep. Configurable later (roadmap).
const MAX_SCAN_DEPTH: usize = 24;

/// Cap on images returned from a single scan. Bounds both the sequential-ish
/// enrichment and the number of rows the UI renders, on every platform where the
/// bundle-skip does not apply (a huge flat folder). Configurable later (roadmap).
const MAX_SCAN_RESULTS: usize = 500;

/// Outcome of a scan: the (capped) image paths and whether the cap was hit, so
/// the frontend can tell the user some images were left out.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanOutcome {
    pub images: Vec<String>,
    pub truncated: bool,
}

/// macOS package / library bundles: directories the Finder treats as opaque
/// files. Recursing into them is wrong — a `.photoslibrary` holds tens of
/// thousands of originals, thumbnails and caches (a real `~/Pictures` scan went
/// from 8 legitimate images to 31k by descending into it). Skipped during the
/// walk, whether passed directly or found nested.
const PACKAGE_BUNDLE_EXTENSIONS: &[&str] = &[
    // Photo / video libraries
    "photoslibrary",
    "photolibrary",
    "aplibrary",
    "migratedaplibrary",
    "pplibrary",
    "imovielibrary",
    "theater",
    "fcpbundle",
    "tvlibrary",
    // Lightroom preview / catalog data
    "lrdata",
    "lrcat",
    // Generic macOS packages
    "app",
    "bundle",
    "framework",
    "plugin",
    "kext",
    "pkg",
    "mpkg",
];

fn is_package_bundle(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(str::to_lowercase)
        .is_some_and(|ext| PACKAGE_BUNDLE_EXTENSIONS.contains(&ext.as_str()))
}

/// Expand a mix of file and directory paths into the supported image files they
/// contain. Directories are walked recursively; hidden entries (dotfiles) and
/// symlinks are skipped — the latter to avoid cycles. Results are de-duplicated
/// and sorted for a stable order. Unsafe paths (outside the allow-list) are
/// skipped rather than fatal: scanning is best-effort input gathering.
pub fn collect_image_paths(paths: &[String]) -> ScanOutcome {
    let mut found: Vec<PathBuf> = Vec::new();

    for raw in paths {
        let path = Path::new(raw);
        if validate_safe_path(path).is_err() {
            continue;
        }
        collect_into(path, 0, &mut found);
    }

    found.sort();
    found.dedup();
    let truncated = found.len() >= MAX_SCAN_RESULTS;
    found.truncate(MAX_SCAN_RESULTS);

    ScanOutcome {
        images: found
            .into_iter()
            .map(|path| path.to_string_lossy().to_string())
            .collect(),
        truncated,
    }
}

/// Recurse into `path`, pushing supported image files onto `found`. Symlinks and
/// macOS packages are skipped (loop / opacity safety); recursion stops past
/// `MAX_SCAN_DEPTH` (cycle backstop) and once `MAX_SCAN_RESULTS` are gathered.
fn collect_into(path: &Path, depth: usize, found: &mut Vec<PathBuf>) {
    if found.len() >= MAX_SCAN_RESULTS || depth > MAX_SCAN_DEPTH {
        return;
    }

    // `symlink_metadata` does not follow the link, so a symlinked directory is
    // reported as a symlink and skipped rather than recursed into.
    let Ok(metadata) = std::fs::symlink_metadata(path) else {
        return;
    };
    let file_type = metadata.file_type();

    if file_type.is_symlink() {
        return;
    }

    if file_type.is_dir() {
        // A macOS package (photo library, app bundle…) is opaque — never recurse
        // into it, or a single `~/Pictures` drop pulls in tens of thousands of
        // library internals.
        if is_package_bundle(path) {
            return;
        }
        let Ok(entries) = std::fs::read_dir(path) else {
            return;
        };
        for entry in entries.flatten() {
            let child = entry.path();
            if is_hidden(&child) {
                continue;
            }
            collect_into(&child, depth + 1, found);
        }
    } else if file_type.is_file() && has_supported_extension(path) {
        found.push(path.to_path_buf());
    }
}

fn is_hidden(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.starts_with('.'))
}

fn has_supported_extension(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(str::to_lowercase)
        .is_some_and(|ext| is_supported_extension(&ext))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn touch(path: &Path) {
        fs::write(path, b"x").unwrap();
    }

    #[test]
    fn collects_supported_images_recursively_sorted_and_deduped() {
        let dir = TempDir::new().unwrap();
        let root = dir.path();
        let nested = root.join("nested");
        fs::create_dir(&nested).unwrap();

        touch(&root.join("a.png"));
        touch(&root.join("b.JPG")); // uppercase extension is normalized
        touch(&root.join("note.txt")); // unsupported
        touch(&nested.join("c.webp"));
        touch(&nested.join(".hidden.png")); // hidden, skipped

        let root_str = root.to_string_lossy().to_string();
        let result = collect_image_paths(&[root_str]);

        let names: Vec<String> = result
            .images
            .iter()
            .map(|p| {
                Path::new(p)
                    .file_name()
                    .unwrap()
                    .to_string_lossy()
                    .to_string()
            })
            .collect();

        assert_eq!(names, vec!["a.png", "b.JPG", "c.webp"]);
        assert!(!result.truncated);
    }

    #[test]
    fn keeps_a_directly_passed_supported_file_and_drops_an_unsupported_one() {
        let dir = TempDir::new().unwrap();
        let image = dir.path().join("photo.jpeg");
        let other = dir.path().join("doc.pdf");
        touch(&image);
        touch(&other);

        let result = collect_image_paths(&[
            image.to_string_lossy().to_string(),
            other.to_string_lossy().to_string(),
        ]);

        assert_eq!(result.images, vec![image.to_string_lossy().to_string()]);
    }

    #[test]
    fn does_not_descend_into_macos_package_bundles() {
        let dir = TempDir::new().unwrap();
        let root = dir.path();

        // A real image at the root, and a Photos-library-like package next to it.
        touch(&root.join("real.png"));
        let library = root.join("Photos Library.photoslibrary");
        let originals = library.join("originals").join("0");
        fs::create_dir_all(&originals).unwrap();
        touch(&originals.join("IMG_0001.jpeg"));
        touch(&originals.join("IMG_0002.heic"));

        let result = collect_image_paths(&[root.to_string_lossy().to_string()]);

        // Only the loose image is returned; the library internals are skipped.
        assert_eq!(result.images.len(), 1);
        assert!(result.images[0].ends_with("real.png"));
    }

    #[test]
    fn deduplicates_when_a_file_is_reached_twice() {
        let dir = TempDir::new().unwrap();
        let image = dir.path().join("x.png");
        touch(&image);

        // The same file passed both directly and via its parent directory.
        let result = collect_image_paths(&[
            image.to_string_lossy().to_string(),
            dir.path().to_string_lossy().to_string(),
        ]);

        assert_eq!(result.images.len(), 1);
    }

    #[test]
    fn stops_recursing_past_the_depth_backstop() {
        let dir = TempDir::new().unwrap();
        // Build a chain deeper than MAX_SCAN_DEPTH with an image at the bottom.
        let mut deep = dir.path().to_path_buf();
        for _ in 0..(MAX_SCAN_DEPTH + 2) {
            deep = deep.join("d");
        }
        fs::create_dir_all(&deep).unwrap();
        touch(&deep.join("buried.png"));

        let result = collect_image_paths(&[dir.path().to_string_lossy().to_string()]);

        // The image sits below the backstop, so it is never reached.
        assert!(result.images.is_empty());
    }

    #[test]
    fn caps_the_result_and_flags_truncation() {
        let dir = TempDir::new().unwrap();
        for i in 0..(MAX_SCAN_RESULTS + 50) {
            touch(&dir.path().join(format!("img_{i:04}.png")));
        }

        let result = collect_image_paths(&[dir.path().to_string_lossy().to_string()]);

        assert_eq!(result.images.len(), MAX_SCAN_RESULTS);
        assert!(result.truncated);
    }
}

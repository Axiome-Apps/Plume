use std::io;
use std::path::{Path, PathBuf};

fn main() {
    if std::env::var("DOCS_RS").is_ok() {
        // Don't link with libheif in case of building documentation for docs.rs.
        return;
    }

    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=wrapper.h");

    // Tell cargo to tell rustc to link the heif library.

    #[cfg(feature = "embedded-libheif")]
    let include_paths = find_libheif_embedded();

    #[cfg(not(feature = "embedded-libheif"))]
    #[cfg(not(all(target_os = "windows", target_env = "msvc")))]
    let include_paths = find_libheif();

    #[cfg(not(feature = "embedded-libheif"))]
    #[cfg(all(target_os = "windows", target_env = "msvc"))]
    let include_paths = {
        install_libheif_by_vcpkg();
        Vec::<String>::new()
    };

    #[cfg(feature = "use-bindgen")]
    run_bindgen(&include_paths);

    // Suppress unused warning when use-bindgen is off
    let _ = include_paths;
}

#[allow(dead_code)]
fn prepare_libheif_src() -> PathBuf {
    let out_path = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let crate_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let libheif_dir = crate_dir.join("vendor/libheif");
    let dst_dir = out_path.join("libheif");
    copy_dir_all(libheif_dir, &dst_dir).unwrap();

    // Patch CMakeLists.txt to disable a building `heifio` library
    // that is used for example applications.
    let cmake_lists_path = dst_dir.join("CMakeLists.txt");
    let mut contents =
        std::fs::read_to_string(&cmake_lists_path).expect("failed to read libheif/CMakeLists.txt");
    contents = contents.replace("add_subdirectory(heifio)", "");
    std::fs::write(&cmake_lists_path, contents).expect("failed to write libheif/CMakeLists.txt");
    dst_dir
}

#[cfg(feature = "embedded-libheif")]
fn compile_libde265() -> PathBuf {
    let out_path = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let crate_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let src = crate_dir.join("vendor/libde265");
    let dst = out_path.join("libde265_src");
    if dst.exists() {
        std::fs::remove_dir_all(&dst).unwrap();
    }
    copy_dir_all(&src, &dst).unwrap();

    // Patch root CMakeLists.txt to remove dec265/enc265 subdirectory calls
    // (we deleted those tool directories from the vendored source)
    let cmake_path = dst.join("CMakeLists.txt");
    let contents = std::fs::read_to_string(&cmake_path).unwrap();
    let contents = contents
        .replace("add_subdirectory (dec265)", "")
        .replace("add_subdirectory (enc265)", "");
    std::fs::write(&cmake_path, contents).unwrap();

    let mut config = cmake::Config::new(&dst);
    config.out_dir(out_path.join("libde265_build"));
    config.define("CMAKE_INSTALL_LIBDIR", "lib");
    config.define("CMAKE_POLICY_VERSION_MINIMUM", "3.5");
    config.define("BUILD_SHARED_LIBS", "OFF");
    config.define("ENABLE_SDL", "OFF");
    config.define("ENABLE_ENCODER", "OFF");
    config.define("ENABLE_DECODER", "ON");
    config.define("BUILD_TESTING", "OFF");
    config.build()
}

#[cfg(feature = "embedded-libheif")]
fn compile_libheif() -> String {
    let out_path = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let libheif_dir = prepare_libheif_src();

    // Build libde265 first
    let de265_prefix = compile_libde265();
    let de265_include = de265_prefix.join("include");
    let de265_lib_dir = de265_prefix.join("lib");

    // Find the actual library file
    let de265_lib = if cfg!(target_os = "windows") {
        // On Windows, cmake builds produce libde265.lib or de265.lib
        let lib1 = de265_lib_dir.join("libde265.lib");
        let lib2 = de265_lib_dir.join("de265.lib");
        if lib1.exists() { lib1 } else { lib2 }
    } else {
        de265_lib_dir.join("libde265.a")
    };

    // Set PKG_CONFIG_PATH so libheif's cmake can find libde265
    let de265_pc_dir = de265_lib_dir.join("pkgconfig");
    if let Ok(existing) = std::env::var("PKG_CONFIG_PATH") {
        std::env::set_var(
            "PKG_CONFIG_PATH",
            format!("{}:{}", de265_pc_dir.display(), existing),
        );
    } else {
        std::env::set_var("PKG_CONFIG_PATH", &de265_pc_dir);
    }
    std::env::set_var("PKG_CONFIG_ALLOW_CROSS", "1");

    let mut build_config = cmake::Config::new(libheif_dir);
    build_config.out_dir(out_path.join("libheif_build"));
    build_config.define("CMAKE_INSTALL_LIBDIR", "lib");

    // Point libheif to our vendored libde265
    build_config.define("CMAKE_PREFIX_PATH", de265_prefix.to_str().unwrap());
    build_config.define("LIBDE265_INCLUDE_DIR", de265_include.to_str().unwrap());
    build_config.define("LIBDE265_LIBRARY", de265_lib.to_str().unwrap());

    // Disable some options
    for key in [
        "BUILD_SHARED_LIBS",
        "BUILD_TESTING",
        "WITH_GDK_PIXBUF",
        "WITH_EXAMPLES",
        "WITH_EXAMPLE_HEIF_THUMB",
        "WITH_EXAMPLE_HEIF_VIEW",
        "ENABLE_EXPERIMENTAL_FEATURES",
        "ENABLE_PLUGIN_LOADING",
        "BUILD_DOCUMENTATION",
    ] {
        build_config.define(key, "OFF");
    }

    // Enable some options
    for key in [
        "WITH_REDUCED_VISIBILITY",
    ] {
        build_config.define(key, "ON");
    }

    // Explicitly disable optional features that pull in system dylibs
    for key in [
        "WITH_LIBSHARPYUV",
        "WITH_UNCOMPRESSED_CODEC",
        "WITH_HEADER_COMPRESSION",
    ] {
        build_config.define(key, "OFF");
    }

    // List of encoders and decoders that have corresponding plugins
    let encoders_decoders = [
        "AOM_DECODER",
        "AOM_ENCODER",
        "DAV1D",
        "LIBDE265",
        "RAV1E",
        "SvtEnc",
        "X264",
        "X265",
        "JPEG_DECODER",
        "JPEG_ENCODER",
        "KVAZAAR",
        "OPENJPH_ENCODER",
        "OpenJPEG_DECODER",
        "OpenJPEG_ENCODER",
        "OPEN_JPH_ENCODER",
        "FFMPEG_DECODER",
        "OpenH264_DECODER",
        "UVG266",
        "VVDEC",
        "VVENC",
    ];

    // Only enable LIBDE265 for HEIC photo decoding.
    // All other codecs are disabled:
    // - Video codecs (x265, dav1d, rav1e, svt, aom, x264) — not needed for photos
    // - JPEG decoder/encoder — Plume uses mozjpeg-sys directly, not via libheif
    let enabled_enc_dec = [
        "LIBDE265",
    ];

    // Enable or disable encoders and decoders
    for key in encoders_decoders {
        let v = if enabled_enc_dec.contains(&key) {
            "ON"
        } else {
            "OFF"
        };
        build_config.define(format!("WITH_{}", key), v);

        // Disable external plugin
        build_config.define(format!("WITH_{}_PLUGIN", key), "OFF");
    }

    let libheif_build = build_config.build();

    libheif_build
        .join("lib/pkgconfig")
        .to_string_lossy()
        .to_string()
}

#[cfg(feature = "embedded-libheif")]
fn find_libheif_embedded() -> Vec<String> {
    // On non-Windows, use system_deps with our embedded build
    #[cfg(not(all(target_os = "windows", target_env = "msvc")))]
    {
        let mut config = system_deps::Config::new();
        std::env::set_var("SYSTEM_DEPS_LIBHEIF_BUILD_INTERNAL", "always");
        config = config.add_build_internal("libheif", |lib, version| {
            let pc_file_path = compile_libheif();
            system_deps::Library::from_internal_pkg_config(pc_file_path, lib, version)
        });

        match config.probe() {
            Ok(deps) => deps
                .all_include_paths()
                .iter()
                .filter_map(|p| p.to_str())
                .map(|p| p.to_string())
                .collect(),
            Err(err) => {
                println!("cargo:error={err}");
                std::process::exit(1);
            }
        }
    }

    // On Windows MSVC, system_deps/pkg-config is not reliable.
    // Compile embedded and emit link directives manually.
    #[cfg(all(target_os = "windows", target_env = "msvc"))]
    {
        let heif_pc_path = compile_libheif();
        // heif_pc_path = "<OUT_DIR>/libheif_build/lib/pkgconfig"
        let heif_prefix = PathBuf::from(&heif_pc_path)
            .parent() // lib/pkgconfig -> lib
            .unwrap()
            .parent() // lib -> prefix
            .unwrap()
            .to_path_buf();
        let heif_lib_dir = heif_prefix.join("lib");
        let heif_include_dir = heif_prefix.join("include");

        let out_path = PathBuf::from(std::env::var("OUT_DIR").unwrap());
        let de265_lib_dir = out_path.join("libde265_build").join("lib");

        println!("cargo:rustc-link-search=native={}", heif_lib_dir.display());
        println!("cargo:rustc-link-search=native={}", de265_lib_dir.display());
        println!("cargo:rustc-link-lib=static=heif");
        println!("cargo:rustc-link-lib=static=de265");

        vec![heif_include_dir.to_string_lossy().to_string()]
    }
}

#[cfg(not(feature = "embedded-libheif"))]
#[cfg(not(all(target_os = "windows", target_env = "msvc")))]
fn find_libheif() -> Vec<String> {
    let config = system_deps::Config::new();

    use system_deps::Error;

    match config.probe() {
        Ok(deps) => deps
            .all_include_paths()
            .iter()
            .filter_map(|p| p.to_str())
            .map(|p| p.to_string())
            .collect(),
        Err(err) => {
            let err_msg = match &err {
                Error::InvalidMetadata(msg) => {
                    if msg.contains("No version") && msg.contains("libheif") {
                        "You MUST enable one of the crate features to specify \
                    minimal supported version of 'libheif' API (e.g. v1_17)."
                            .to_string()
                    } else {
                        err.to_string()
                    }
                }
                _ => err.to_string(),
            };
            println!("cargo:error={err_msg}");
            std::process::exit(1);
        }
    }
}

#[cfg(not(feature = "embedded-libheif"))]
#[cfg(all(target_os = "windows", target_env = "msvc"))]
fn install_libheif_by_vcpkg() {
    let vcpkg_lib = vcpkg::Config::new()
        .emit_includes(true)
        .find_package("libheif");
    if let Err(err) = vcpkg_lib {
        println!("cargo:warning={}", err);
        std::process::exit(1);
    }
}

#[cfg(feature = "use-bindgen")]
fn run_bindgen(include_paths: &[String]) {
    let mut base_builder = bindgen::Builder::default()
        .header("wrapper.h")
        .generate_comments(true)
        .formatter(bindgen::Formatter::Rustfmt)
        .generate_cstr(true)
        .disable_name_namespacing()
        .array_pointers_in_arguments(true)
        .ctypes_prefix("libc")
        .allowlist_function("heif_.*")
        .allowlist_type("heif_.*")
        .size_t_is_usize(true)
        .clang_args([
            "-fparse-all-comments",
            "-fretain-comments-from-system-headers",
        ]);

    for path in include_paths {
        base_builder = base_builder.clang_arg(format!("-I{path}"));
    }

    // Don't derive Copy and Clone for structures with pointers
    // and which represents shared_ptr from C++.
    for struct_name in [
        "heif_plugin_info",
        "heif_decoding_options",
        "heif_encoding_options",
        "heif_property_user_description",
        "heif_reader_range_request_result",
        "heif_entity_group",
        "heif_depth_representation_info",
        "heif_camera_extrinsic_matrix",
        "heif_track",
        "heif_raw_sequence_sample",
        "heif_track_options",
        "heif_sequence_encoding_options",
        "heif_context",
        "heif_image_handle",
        "heif_decoder_plugin",
        "heif_encoder_plugin",
        "heif_image",
        "heif_scaling_options",
        "heif_encoder",
        "heif_reading_options",
        "heif_encoder_descriptor",
        "heif_encoder_parameter",
        "heif_decoder_descriptor",
        "heif_region_item",
        "heif_region",
    ] {
        base_builder = base_builder.no_copy(struct_name);
    }

    // The main module
    // Finish the builder and generate the bindings.
    let bindings = base_builder
        .clone()
        .generate()
        .expect("Unable to generate bindings");

    // Write the bindings to the $OUT_DIR/bindings.rs file.
    let out_path = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Couldn't write bindings.rs!");

    // Create linker_test.rs module for testing cases when not all
    // functions from *.h files are really available in libheif.
    let code = bindings.to_string();
    let mut func_names = Vec::new();
    for line in code.lines() {
        if !line.contains("pub fn ") {
            continue;
        }
        let line = line.trim();
        let res: Vec<&str> = line.split(&[' ', '(']).collect();
        if res.len() > 3 {
            if let &["pub", "fn", name] = &res[..3] {
                func_names.push(name)
            }
        }
    }

    let mut result = vec![
        "use super::*;\n\n",
        "#[test]\n",
        "fn is_all_functions_exists_in_libheif() {\n",
        "    let fn_pointers = [\n",
    ];
    for name in func_names {
        result.push("        ");
        result.push(name);
        result.push(" as *const fn(),\n")
    }
    result.extend(vec![
        "    ];\n",
        "    for pointer in fn_pointers.iter() {\n",
        "        assert!(!pointer.is_null());\n",
        "    }\n",
        "}\n",
    ]);
    let test_module = result.join("");
    let test_path = out_path.join("linker_test.rs");
    std::fs::write(&test_path, test_module).expect("Couldn't write test module!");

    let bindings = base_builder
        .layout_tests(false)
        .generate()
        .expect("Unable to generate bindings without tests");
    bindings
        .write_to_file(out_path.join("bindings_wo_tests.rs"))
        .expect("Couldn't write bindings_wo_tests.rs!");
}

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> io::Result<()> {
    std::fs::create_dir_all(&dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            std::fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

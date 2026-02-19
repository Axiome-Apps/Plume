use crate::domain::compression::{
    error::{CompressionError, CompressionResult},
    formats::OutputFormat,
    settings::CompressionSettings,
    stats::{create_stat, CompressionStat},
};
use image::DynamicImage;
use std::path::Path;

/// Decode a HEIC/HEIF file into a DynamicImage using libheif-rs (public for preview)
pub fn decode_heic_public(input_data: &[u8]) -> CompressionResult<DynamicImage> {
    let (img, _icc) = decode_heic(input_data)?;
    Ok(img)
}

/// Decode a HEIC/HEIF file into a DynamicImage + optional ICC profile using libheif-rs
fn decode_heic(input_data: &[u8]) -> CompressionResult<(DynamicImage, Option<Vec<u8>>)> {
    let lib_heif = libheif_rs::LibHeif::new();

    let ctx = libheif_rs::HeifContext::read_from_bytes(input_data).map_err(|e| {
        CompressionError::ProcessingError(format!("Failed to read HEIC context: {}", e))
    })?;

    let handle = ctx.primary_image_handle().map_err(|e| {
        CompressionError::ProcessingError(format!("Failed to get HEIC primary image: {}", e))
    })?;

    // Extract ICC profile BEFORE decode (original, untransformed profile)
    let icc_profile = handle.color_profile_raw().map(|p| p.data);

    let heif_image = lib_heif
        .decode(
            &handle,
            libheif_rs::ColorSpace::Rgb(libheif_rs::RgbChroma::Rgba),
            None,
        )
        .map_err(|e| {
            CompressionError::ProcessingError(format!("Failed to decode HEIC image: {}", e))
        })?;

    let width = handle.width();
    let height = handle.height();

    let planes = heif_image.planes();
    let plane = planes.interleaved.ok_or_else(|| {
        CompressionError::ProcessingError("HEIC image has no interleaved plane data".to_string())
    })?;

    let stride = plane.stride;
    let plane_data = plane.data;

    // Copy pixel data row by row (stride may differ from width * 4)
    let mut rgba_data = Vec::with_capacity((width * height * 4) as usize);
    for y in 0..height as usize {
        let row_start = y * stride;
        let row_end = row_start + (width as usize * 4);
        rgba_data.extend_from_slice(&plane_data[row_start..row_end]);
    }

    let img_buf: image::RgbaImage = image::ImageBuffer::from_raw(width, height, rgba_data)
        .ok_or_else(|| {
            CompressionError::ProcessingError(
                "Failed to create image buffer from HEIC data".to_string(),
            )
        })?;

    Ok((DynamicImage::ImageRgba8(img_buf), icc_profile))
}

/// Decode any supported image format, returning the image + optional ICC profile
fn decode_image_with_icc(
    input_data: &[u8],
    input_format: &str,
) -> CompressionResult<(DynamicImage, Option<Vec<u8>>)> {
    use image::ImageFormat;

    match input_format.to_lowercase().as_str() {
        "heic" | "heif" => decode_heic(input_data),
        "png" => {
            let img =
                image::load_from_memory_with_format(input_data, ImageFormat::Png).map_err(|e| {
                    CompressionError::ProcessingError(format!("Erreur décodage image: {}", e))
                })?;
            Ok((img, None))
        }
        "jpg" | "jpeg" => {
            let img = image::load_from_memory_with_format(input_data, ImageFormat::Jpeg).map_err(
                |e| CompressionError::ProcessingError(format!("Erreur décodage image: {}", e)),
            )?;
            Ok((img, None))
        }
        "webp" => {
            let img = image::load_from_memory_with_format(input_data, ImageFormat::WebP).map_err(
                |e| CompressionError::ProcessingError(format!("Erreur décodage image: {}", e)),
            )?;
            Ok((img, None))
        }
        _ => Err(CompressionError::UnsupportedFormat(format!(
            "Format {} non supporté",
            input_format
        ))),
    }
}

/// Result of a compression operation
#[derive(Debug, Clone)]
pub struct CompressionOutput {
    pub output_path: std::path::PathBuf,
    pub original_size: u64,
    pub compressed_size: u64,
    pub format: OutputFormat,
    pub savings_percent: f64,
}

impl CompressionOutput {
    pub fn new(
        output_path: std::path::PathBuf,
        original_size: u64,
        compressed_size: u64,
        format: OutputFormat,
    ) -> Self {
        let savings_percent = if original_size > 0 {
            ((original_size as f64 - compressed_size as f64) / original_size as f64) * 100.0
        } else {
            0.0
        };

        Self {
            output_path,
            original_size,
            compressed_size,
            format,
            savings_percent,
        }
    }
}

/// Compress image file-to-file using the specified settings
pub fn compress_file_to_file<P: AsRef<Path>>(
    input_path: P,
    output_path: P,
    settings: &CompressionSettings,
) -> CompressionResult<CompressionOutput> {
    validate_settings(settings)?;

    let input_path = input_path.as_ref();
    let output_path = output_path.as_ref();

    // Get original file size
    let original_size = std::fs::metadata(input_path)
        .map_err(|e| CompressionError::IoError(format!("Failed to get file metadata: {}", e)))?
        .len();

    // Determine input format from extension
    let input_format = input_path
        .extension()
        .and_then(|ext| ext.to_str())
        .ok_or_else(|| CompressionError::UnsupportedFormat("No file extension".to_string()))?;

    // Route to appropriate compression function based on target format
    match settings.format {
        OutputFormat::WebP => {
            compress_to_webp_file(input_path, output_path, input_format, settings)?
        }
        OutputFormat::Png => compress_to_png_file(input_path, output_path, input_format, settings)?,
        OutputFormat::Jpeg => {
            compress_to_jpeg_file(input_path, output_path, input_format, settings)?
        }
    };

    // Get compressed file size
    let compressed_size = std::fs::metadata(output_path)
        .map_err(|e| {
            CompressionError::IoError(format!("Failed to get output file metadata: {}", e))
        })?
        .len();

    Ok(CompressionOutput::new(
        output_path.to_path_buf(),
        original_size,
        compressed_size,
        settings.format,
    ))
}

/// Compress multiple images in batch (file-to-file)
pub fn compress_batch_files(
    files: Vec<(std::path::PathBuf, std::path::PathBuf)>, // (input_path, output_path) pairs
    settings: &CompressionSettings,
) -> Vec<CompressionResult<CompressionOutput>> {
    files
        .into_iter()
        .map(|(input_path, output_path)| compress_file_to_file(input_path, output_path, settings))
        .collect()
}

/// Legacy function - use compress_file_to_file instead
#[deprecated(note = "Use compress_file_to_file for better memory efficiency")]
pub fn compress_file<P: AsRef<Path>>(
    file_path: P,
    settings: &CompressionSettings,
) -> CompressionResult<CompressionOutput> {
    let input_path = file_path.as_ref();

    // Create output path with new extension
    let mut output_path = input_path.to_path_buf();
    let new_extension = match settings.format {
        OutputFormat::WebP => "webp",
        OutputFormat::Png => "png",
        OutputFormat::Jpeg => "jpg",
    };
    output_path.set_extension(new_extension);

    compress_file_to_file(input_path, &output_path, settings)
}

/// Create a compression statistic from the operation result
pub fn create_compression_stat(
    input_format: &str,
    output: &CompressionOutput,
    settings: &CompressionSettings,
) -> CompressionStat {
    create_stat(
        input_format.to_string(),
        output.format.to_string().to_lowercase(),
        output.original_size,
        output.compressed_size,
        settings,
    )
}

// Private compression functions for each format (file-to-file)

fn compress_to_webp_file(
    input_path: &Path,
    output_path: &Path,
    input_format: &str,
    settings: &CompressionSettings,
) -> CompressionResult<()> {
    let input_data = std::fs::read(input_path)
        .map_err(|e| CompressionError::IoError(format!("Failed to read input file: {}", e)))?;

    let (img, icc_profile) = decode_image_with_icc(&input_data, input_format)?;

    // Encode en WebP avec webp crate + WebPConfig optimisé
    let has_alpha = img.color().has_alpha();

    let encoded = if has_alpha {
        let rgba_img = img.to_rgba8();
        let (width, height) = rgba_img.dimensions();
        let encoder = webp::Encoder::from_rgba(rgba_img.as_raw(), width, height);
        encode_webp_advanced(&encoder, settings)?
    } else {
        let rgb_img = img.to_rgb8();
        let (width, height) = rgb_img.dimensions();
        let encoder = webp::Encoder::from_rgb(rgb_img.as_raw(), width, height);
        encode_webp_advanced(&encoder, settings)?
    };

    // Inject ICC profile into WebP RIFF container if present
    let output_data = match icc_profile {
        Some(ref icc) => inject_icc_into_webp(&encoded, icc),
        None => encoded.to_vec(),
    };

    std::fs::write(output_path, &output_data)
        .map_err(|e| CompressionError::IoError(format!("Failed to write output file: {}", e)))?;

    Ok(())
}

fn compress_to_png_file(
    input_path: &Path,
    output_path: &Path,
    input_format: &str,
    _settings: &CompressionSettings,
) -> CompressionResult<()> {
    match input_format.to_lowercase().as_str() {
        "png" => {
            // Pour PNG -> PNG, utilise oxipng directement (preserves existing ICC chunks)
            let options = oxipng::Options::from_preset(3);
            let input_data = std::fs::read(input_path).map_err(|e| {
                CompressionError::IoError(format!("Failed to read PNG file: {}", e))
            })?;
            match oxipng::optimize_from_memory(&input_data, &options) {
                Ok(optimized_data) => {
                    std::fs::write(output_path, optimized_data).map_err(|e| {
                        CompressionError::IoError(format!("Failed to write optimized PNG: {}", e))
                    })?;
                }
                Err(_) => {
                    std::fs::copy(input_path, output_path).map_err(|e| {
                        CompressionError::IoError(format!("Failed to copy PNG file: {}", e))
                    })?;
                }
            }
            Ok(())
        }
        _ => {
            let input_data = std::fs::read(input_path).map_err(|e| {
                CompressionError::IoError(format!("Failed to read input file: {}", e))
            })?;

            let (img, icc_profile) = decode_image_with_icc(&input_data, input_format)?;

            // Encode PNG with ICC profile using PngEncoder
            encode_png_with_icc(&img, output_path, icc_profile.as_deref())?;

            // Optimize with oxipng (preserves iCCP chunks by default)
            let options = oxipng::Options::from_preset(3);
            if let Ok(png_data) = std::fs::read(output_path) {
                if let Ok(optimized_data) = oxipng::optimize_from_memory(&png_data, &options) {
                    let _ = std::fs::write(output_path, optimized_data);
                }
            }

            Ok(())
        }
    }
}

fn compress_to_jpeg_file(
    input_path: &Path,
    output_path: &Path,
    input_format: &str,
    settings: &CompressionSettings,
) -> CompressionResult<()> {
    let input_data = std::fs::read(input_path)
        .map_err(|e| CompressionError::IoError(format!("Failed to read input file: {}", e)))?;

    let (img, icc_profile) = decode_image_with_icc(&input_data, input_format)?;

    // Convert to RGB (JPEG does not support transparency)
    let rgb_img = img.to_rgb8();
    let (width, height) = rgb_img.dimensions();
    let pixels = rgb_img.as_raw();

    let jpeg_data = encode_jpeg_mozjpeg(
        pixels,
        width,
        height,
        settings.quality,
        icc_profile.as_deref(),
    )?;

    std::fs::write(output_path, &jpeg_data)
        .map_err(|e| CompressionError::IoError(format!("Failed to write JPEG file: {}", e)))?;

    Ok(())
}

/// Encode a DynamicImage to PNG with optional ICC profile
fn encode_png_with_icc(
    img: &DynamicImage,
    output_path: &Path,
    icc_profile: Option<&[u8]>,
) -> CompressionResult<()> {
    use image::ImageEncoder;

    let output_file = std::fs::File::create(output_path)
        .map_err(|e| CompressionError::IoError(format!("Failed to create output file: {}", e)))?;
    let writer = std::io::BufWriter::new(output_file);

    let mut encoder = image::codecs::png::PngEncoder::new(writer);

    if let Some(icc) = icc_profile {
        let _ = encoder.set_icc_profile(icc.to_vec());
    }

    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();
    encoder
        .write_image(
            rgba.as_raw(),
            width,
            height,
            image::ExtendedColorType::Rgba8,
        )
        .map_err(|e| CompressionError::ProcessingError(format!("Erreur encodage PNG: {}", e)))?;

    Ok(())
}

/// Encode RGB pixels to JPEG using mozjpeg with optional ICC profile
fn encode_jpeg_mozjpeg(
    pixels: &[u8],
    width: u32,
    height: u32,
    quality: u8,
    icc_profile: Option<&[u8]>,
) -> CompressionResult<Vec<u8>> {
    unsafe {
        let mut cinfo: mozjpeg_sys::jpeg_compress_struct = std::mem::zeroed();
        let mut jerr: mozjpeg_sys::jpeg_error_mgr = std::mem::zeroed();

        cinfo.common.err = mozjpeg_sys::jpeg_std_error(&mut jerr);
        mozjpeg_sys::jpeg_CreateCompress(
            &mut cinfo,
            mozjpeg_sys::JPEG_LIB_VERSION,
            std::mem::size_of::<mozjpeg_sys::jpeg_compress_struct>(),
        );

        // Setup memory destination
        let mut buf_ptr: *mut u8 = std::ptr::null_mut();
        let mut buf_size: std::ffi::c_ulong = 0;
        mozjpeg_sys::jpeg_mem_dest(&mut cinfo, &mut buf_ptr, &mut buf_size);

        cinfo.image_width = width;
        cinfo.image_height = height;
        cinfo.input_components = 3;
        cinfo.in_color_space = mozjpeg_sys::J_COLOR_SPACE::JCS_RGB;

        mozjpeg_sys::jpeg_set_defaults(&mut cinfo);
        mozjpeg_sys::jpeg_set_quality(&mut cinfo, quality as i32, true as i32);

        mozjpeg_sys::jpeg_start_compress(&mut cinfo, true as i32);

        // Write ICC profile after start_compress, before scanlines
        if let Some(icc) = icc_profile {
            mozjpeg_sys::jpeg_write_icc_profile(
                &mut cinfo,
                icc.as_ptr(),
                icc.len() as std::ffi::c_uint,
            );
        }

        let row_stride = width as usize * 3;
        while cinfo.next_scanline < cinfo.image_height {
            let row_offset = cinfo.next_scanline as usize * row_stride;
            let row_ptr = pixels.as_ptr().add(row_offset) as *const u8;
            let mut row_array = [row_ptr];
            mozjpeg_sys::jpeg_write_scanlines(&mut cinfo, row_array.as_mut_ptr(), 1);
        }

        mozjpeg_sys::jpeg_finish_compress(&mut cinfo);

        // Copy buffer before destroying
        let result = if !buf_ptr.is_null() && buf_size > 0 {
            std::slice::from_raw_parts(buf_ptr, buf_size as usize).to_vec()
        } else {
            return Err(CompressionError::ProcessingError(
                "mozjpeg produced empty output".to_string(),
            ));
        };

        mozjpeg_sys::jpeg_destroy_compress(&mut cinfo);

        // Free the buffer allocated by jpeg_mem_dest
        if !buf_ptr.is_null() {
            libc_free(buf_ptr as *mut std::ffi::c_void);
        }

        Ok(result)
    }
}

extern "C" {
    fn free(ptr: *mut std::ffi::c_void);
}

unsafe fn libc_free(ptr: *mut std::ffi::c_void) {
    free(ptr);
}

/// Inject an ICC profile into a WebP RIFF container.
///
/// WebP files use the RIFF container format. To embed ICC, we need the
/// extended format (VP8X header) with an ICCP chunk.
///
/// Layout: RIFF [size] WEBP VP8X [flags] ICCP [icc_data] VP8/VP8L [payload]
fn inject_icc_into_webp(webp_data: &[u8], icc_data: &[u8]) -> Vec<u8> {
    // Minimum valid WebP: "RIFF" + size(4) + "WEBP" + chunk = 12+ bytes
    if webp_data.len() < 12 {
        return webp_data.to_vec();
    }

    // Parse existing RIFF header
    let fourcc = &webp_data[8..12];
    if fourcc != b"WEBP" {
        return webp_data.to_vec();
    }

    // Identify the payload chunk type starting at offset 12
    let chunk_type = &webp_data[12..16];

    // Build padded ICCP chunk (RIFF chunks must be even-aligned)
    let icc_chunk = build_riff_chunk(b"ICCP", icc_data);

    if chunk_type == b"VP8X" {
        // Already extended format: inject ICCP flag + chunk after VP8X
        inject_icc_into_extended_webp(webp_data, &icc_chunk)
    } else {
        // Simple format (VP8 or VP8L): wrap in VP8X + ICCP
        wrap_simple_webp_with_icc(webp_data, &icc_chunk, chunk_type)
    }
}

/// Build a RIFF chunk: FourCC + LE32 size + data + optional padding byte
fn build_riff_chunk(fourcc: &[u8; 4], data: &[u8]) -> Vec<u8> {
    let mut chunk = Vec::with_capacity(8 + data.len() + 1);
    chunk.extend_from_slice(fourcc);
    chunk.extend_from_slice(&(data.len() as u32).to_le_bytes());
    chunk.extend_from_slice(data);
    if data.len() % 2 != 0 {
        chunk.push(0); // RIFF padding
    }
    chunk
}

/// Inject ICCP into an already-extended WebP (has VP8X)
fn inject_icc_into_extended_webp(webp_data: &[u8], icc_chunk: &[u8]) -> Vec<u8> {
    // VP8X chunk is at offset 12, payload at 20, flags at byte 20
    // VP8X payload is always 10 bytes
    let vp8x_end = 12 + 8 + 10; // 30

    if webp_data.len() < vp8x_end {
        return webp_data.to_vec();
    }

    // Set ICC flag (bit 5 of flags byte at offset 20)
    let mut flags_byte = webp_data[20];
    flags_byte |= 0b0010_0000; // ICC profile flag

    let mut result = Vec::with_capacity(webp_data.len() + icc_chunk.len());
    // RIFF header placeholder (we'll fix the size later)
    result.extend_from_slice(&webp_data[..20]);
    result.push(flags_byte);
    result.extend_from_slice(&webp_data[21..vp8x_end]);
    // Insert ICCP chunk right after VP8X
    result.extend_from_slice(icc_chunk);
    // Rest of the file (VP8/VP8L/ALPH etc.)
    result.extend_from_slice(&webp_data[vp8x_end..]);

    // Fix RIFF file size (bytes 4..8 = total size - 8)
    let riff_size = (result.len() - 8) as u32;
    result[4..8].copy_from_slice(&riff_size.to_le_bytes());

    result
}

/// Wrap a simple WebP (VP8/VP8L) into extended format with VP8X + ICCP
fn wrap_simple_webp_with_icc(webp_data: &[u8], icc_chunk: &[u8], chunk_type: &[u8]) -> Vec<u8> {
    // Read canvas dimensions from the bitstream
    let (canvas_w, canvas_h) = read_webp_dimensions(webp_data, chunk_type);

    // VP8X flags: bit 5 = ICC
    let mut vp8x_payload = [0u8; 10];
    vp8x_payload[0] = 0b0010_0000; // ICC flag

    // If source is VP8L (lossless), also set the alpha flag since VP8L may contain alpha
    if chunk_type == b"VP8L" {
        vp8x_payload[0] |= 0b0001_0000; // Alpha flag
    }

    // Canvas size is stored as (width-1) and (height-1) in 24-bit LE
    let w_minus_1 = canvas_w.saturating_sub(1);
    let h_minus_1 = canvas_h.saturating_sub(1);
    vp8x_payload[4] = (w_minus_1 & 0xFF) as u8;
    vp8x_payload[5] = ((w_minus_1 >> 8) & 0xFF) as u8;
    vp8x_payload[6] = ((w_minus_1 >> 16) & 0xFF) as u8;
    vp8x_payload[7] = (h_minus_1 & 0xFF) as u8;
    vp8x_payload[8] = ((h_minus_1 >> 8) & 0xFF) as u8;
    vp8x_payload[9] = ((h_minus_1 >> 16) & 0xFF) as u8;

    let vp8x_chunk = build_riff_chunk(b"VP8X", &vp8x_payload);

    // Payload = everything after "RIFF....WEBP" (offset 12)
    let payload = &webp_data[12..];

    let total_size = 4 + vp8x_chunk.len() + icc_chunk.len() + payload.len(); // "WEBP" + chunks
    let mut result = Vec::with_capacity(8 + total_size);
    result.extend_from_slice(b"RIFF");
    result.extend_from_slice(&(total_size as u32).to_le_bytes());
    result.extend_from_slice(b"WEBP");
    result.extend_from_slice(&vp8x_chunk);
    result.extend_from_slice(icc_chunk);
    result.extend_from_slice(payload);

    result
}

/// Read canvas dimensions from a WebP bitstream
fn read_webp_dimensions(webp_data: &[u8], chunk_type: &[u8]) -> (u32, u32) {
    // Default fallback
    let default = (1, 1);

    if webp_data.len() < 30 {
        return default;
    }

    // Chunk data starts at offset 20 (12 RIFF header + 4 FourCC + 4 size)
    let chunk_data_offset = 20;

    if chunk_type == b"VP8 " {
        // VP8 lossy: dimensions at bytes 6-9 of frame data (after 3-byte frame tag)
        // Frame header: [frame_tag(3)] [start_code(3): 0x9D 0x01 0x2A] [width(2)] [height(2)]
        let offset = chunk_data_offset;
        if webp_data.len() < offset + 10 {
            return default;
        }
        let width = u16::from_le_bytes([webp_data[offset + 6], webp_data[offset + 7]]) & 0x3FFF;
        let height = u16::from_le_bytes([webp_data[offset + 8], webp_data[offset + 9]]) & 0x3FFF;
        (width as u32, height as u32)
    } else if chunk_type == b"VP8L" {
        // VP8L lossless: signature byte (0x2F) then 32-bit LE with packed w/h
        let offset = chunk_data_offset;
        if webp_data.len() < offset + 5 {
            return default;
        }
        let bits = u32::from_le_bytes([
            webp_data[offset + 1],
            webp_data[offset + 2],
            webp_data[offset + 3],
            webp_data[offset + 4],
        ]);
        let width = (bits & 0x3FFF) + 1;
        let height = ((bits >> 14) & 0x3FFF) + 1;
        (width, height)
    } else {
        default
    }
}

// Helper functions

fn encode_webp_advanced(
    encoder: &webp::Encoder,
    settings: &CompressionSettings,
) -> CompressionResult<webp::WebPMemory> {
    let mut config = webp::WebPConfig::new().map_err(|_| {
        CompressionError::ProcessingError("Failed to create WebPConfig".to_string())
    })?;

    if settings.quality == 100 {
        // Lossless mode
        config.lossless = 1;
        config.quality = 75.0;
        config.alpha_compression = 0;
    } else {
        // Lossy mode with optimized settings
        config.lossless = 0;
        config.quality = settings.quality as f32;
        config.method = 4; // Good quality/speed tradeoff
        config.use_sharp_yuv = 1; // Precise RGB→YUV, fixes color desaturation
        config.alpha_quality = 100; // Don't degrade alpha channel
        config.autofilter = 1; // Auto deblocking filter
    }

    encoder
        .encode_advanced(&config)
        .map_err(|e| CompressionError::ProcessingError(format!("WebP encoding failed: {:?}", e)))
}

fn validate_settings(settings: &CompressionSettings) -> CompressionResult<()> {
    if !settings.is_valid() {
        return Err(CompressionError::InvalidSettings(format!(
            "Invalid quality setting: {}",
            settings.quality
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compression_output_creation() {
        let output_path = std::path::PathBuf::from("/tmp/test.webp");
        let output = CompressionOutput::new(output_path.clone(), 1000, 5, OutputFormat::WebP);

        assert_eq!(output.output_path, output_path);
        assert_eq!(output.original_size, 1000);
        assert_eq!(output.compressed_size, 5);
        assert!(output.savings_percent > 99.0); // 995/1000 * 100
    }

    #[test]
    fn test_settings_validation() {
        let settings = CompressionSettings::new(80, OutputFormat::WebP);
        assert!(validate_settings(&settings).is_ok());

        let mut invalid_settings = CompressionSettings::new(80, OutputFormat::WebP);
        invalid_settings.quality = 200; // Invalid quality
        assert!(validate_settings(&invalid_settings).is_err());
    }

    #[test]
    fn test_build_riff_chunk() {
        let data = b"test data";
        let chunk = build_riff_chunk(b"ICCP", data);
        assert_eq!(&chunk[0..4], b"ICCP");
        let size = u32::from_le_bytes([chunk[4], chunk[5], chunk[6], chunk[7]]);
        assert_eq!(size, 9);
        assert_eq!(&chunk[8..17], data);
        // Odd size → padding byte
        assert_eq!(chunk.len(), 18);
        assert_eq!(chunk[17], 0);
    }

    #[test]
    fn test_build_riff_chunk_even() {
        let data = b"test";
        let chunk = build_riff_chunk(b"ICCP", data);
        // Even size → no padding
        assert_eq!(chunk.len(), 12);
    }

    #[test]
    fn test_inject_icc_into_webp_too_small() {
        let small = vec![0u8; 5];
        let icc = vec![1, 2, 3];
        let result = inject_icc_into_webp(&small, &icc);
        assert_eq!(result, small);
    }
}

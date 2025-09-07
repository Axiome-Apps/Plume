// Image Domain - Functional Architecture
//
// This module provides image processing, analysis, and metadata extraction using pure functions
// and data structures, following Rust idioms for efficient image manipulation.

pub mod analysis;
pub mod error;
pub mod metadata;
pub mod processing;

// Re-export core types and functions for easy access
pub use analysis::{
    analyze_colors, analyze_compression_potential, assess_image_quality, comprehensive_analysis,
    ColorAnalysis, CompressionPotential, QualityAssessment, RiskLevel,
};
pub use error::{ImageError, ImageResult};
pub use metadata::{
    classify_image_type, extract_metadata, ColorSpace, Dimensions, ImageMetadata, ImageType,
};
pub use processing::{
    apply_sharpening, auto_crop, convert_color_space, create_progressive_jpeg, optimize_for_web,
    resize_image, ProcessingParams, ProcessingResult,
};

// Convenience functions for common image operations

/// Load and analyze image from data
pub fn analyze_image(
    data: &[u8],
    format: &str,
) -> ImageResult<(ImageMetadata, QualityAssessment, ColorAnalysis)> {
    let mut metadata = extract_metadata(data, format)?;
    metadata.image_type = classify_image_type(&metadata);

    let quality = assess_image_quality(&metadata)?;
    let colors = analyze_colors(&metadata)?;

    Ok((metadata, quality, colors))
}

/// Get compression recommendations for an image
pub fn get_compression_recommendations(
    data: &[u8],
    format: &str,
) -> ImageResult<CompressionPotential> {
    let (metadata, quality, colors) = analyze_image(data, format)?;
    Ok(analyze_compression_potential(&metadata, &quality, &colors))
}

/// Prepare image for web delivery with optimal settings
pub fn prepare_for_web(
    data: &[u8],
    format: &str,
    max_dimensions: Option<Dimensions>,
    target_quality: Option<u8>,
) -> ImageResult<ProcessingResult> {
    let (metadata, quality, colors) = analyze_image(data, format)?;
    let compression_potential = analyze_compression_potential(&metadata, &quality, &colors);

    // Determine optimal parameters
    let quality_setting = target_quality.unwrap_or(compression_potential.recommended_quality);

    let mut params = ProcessingParams::new(quality_setting);

    // Apply resize if max dimensions specified and current image is larger
    if let Some(max_dims) = max_dimensions {
        if metadata.dimensions.width > max_dims.width
            || metadata.dimensions.height > max_dims.height
        {
            // Calculate proportional resize
            let width_ratio = max_dims.width as f64 / metadata.dimensions.width as f64;
            let height_ratio = max_dims.height as f64 / metadata.dimensions.height as f64;
            let scale = width_ratio.min(height_ratio);

            let new_width = (metadata.dimensions.width as f64 * scale) as u32;
            let new_height = (metadata.dimensions.height as f64 * scale) as u32;

            if let Ok(target_dims) = Dimensions::new(new_width.max(1), new_height.max(1)) {
                params = params.with_resize(target_dims);
            }
        }
    }

    // Use lossless for high-risk images
    if compression_potential.risk_level == RiskLevel::High {
        params = params.with_lossless();
    }

    optimize_for_web(data, &metadata, &params)
}

/// Smart resize that maintains aspect ratio
pub fn smart_resize(
    data: &[u8],
    format: &str,
    target_dimensions: Dimensions,
    maintain_aspect_ratio: bool,
) -> ImageResult<(Vec<u8>, Dimensions)> {
    let metadata = extract_metadata(data, format)?;

    let final_dimensions = if maintain_aspect_ratio {
        calculate_aspect_preserving_dimensions(&metadata.dimensions, &target_dimensions)
    } else {
        target_dimensions
    };

    let resized_data = resize_image(data, &metadata, &final_dimensions)?;
    Ok((resized_data, final_dimensions))
}

/// Calculate dimensions that preserve aspect ratio
fn calculate_aspect_preserving_dimensions(current: &Dimensions, target: &Dimensions) -> Dimensions {
    let current_ratio = current.aspect_ratio();
    let target_ratio = target.aspect_ratio();

    let (width, height) = if current_ratio > target_ratio {
        // Current is wider, fit to width
        let width = target.width;
        let height = (width as f64 / current_ratio) as u32;
        (width, height.max(1))
    } else {
        // Current is taller, fit to height
        let height = target.height;
        let width = (height as f64 * current_ratio) as u32;
        (width.max(1), height)
    };

    // This should not fail since we ensure width and height are at least 1
    Dimensions::new(width, height).unwrap_or_else(|_| {
        // Fallback to target dimensions if calculation fails
        target.clone()
    })
}

/// Batch process multiple images
pub fn batch_process_images<F>(
    images: &[(Vec<u8>, String)], // (data, format) pairs
    processor: F,
) -> Vec<ImageResult<ProcessingResult>>
where
    F: Fn(&[u8], &str) -> ImageResult<ProcessingResult> + Copy,
{
    images
        .iter()
        .map(|(data, format)| processor(data, format))
        .collect()
}

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    fn test_analyze_image_workflow() {
        // Create fake PNG data with proper signature
        let mut png_data = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]; // PNG signature
        png_data.extend(vec![0; 16]); // Add 16 bytes for IHDR header
                                      // Add width and height (1920x1080 in big-endian)
        png_data[16..20].copy_from_slice(&1920u32.to_be_bytes());
        png_data[20..24].copy_from_slice(&1080u32.to_be_bytes());

        let result = analyze_image(&png_data, "png");
        assert!(result.is_ok());

        let (metadata, quality, colors) = result.unwrap();
        assert_eq!(metadata.format, "png");
        assert_eq!(metadata.dimensions.width, 1920);
        assert_eq!(metadata.dimensions.height, 1080);
        assert!(quality.overall_quality > 0.0);
        assert!(colors.unique_color_estimate > 0);
    }

    #[test]
    fn test_compression_recommendations() {
        let fake_data = vec![0u8; 1000];
        let result = get_compression_recommendations(&fake_data, "jpg");
        assert!(result.is_ok());

        let recommendations = result.unwrap();
        assert!(recommendations.estimated_savings_percent >= 0.0);
        assert!(
            recommendations.recommended_quality >= 1 && recommendations.recommended_quality <= 100
        );
    }

    #[test]
    fn test_prepare_for_web() {
        let fake_data = vec![0u8; 10000];
        let max_dims = Dimensions::new(800, 600).unwrap();

        let result = prepare_for_web(&fake_data, "png", Some(max_dims), Some(80));
        assert!(result.is_ok());

        let processed = result.unwrap();
        assert!(processed.processed_size > 0);
        assert!(!processed.operations_applied.is_empty());
    }

    #[test]
    fn test_smart_resize() {
        // Create fake image data
        let fake_data = vec![0u8; 30000]; // Simulates 100x100 RGB
        let target = Dimensions::new(200, 150).unwrap();

        let result = smart_resize(&fake_data, "png", target.clone(), true);
        assert!(result.is_ok());

        let (resized_data, final_dims) = result.unwrap();
        assert!(!resized_data.is_empty());
        // With aspect ratio preservation, one dimension should match target
        assert!(final_dims.width <= target.width);
        assert!(final_dims.height <= target.height);
    }

    #[test]
    fn test_calculate_aspect_preserving_dimensions() {
        let current = Dimensions::new(1920, 1080).unwrap(); // 16:9
        let target = Dimensions::new(800, 800).unwrap(); // Square

        let result = calculate_aspect_preserving_dimensions(&current, &target);

        // Should fit to width since 1920/1080 > 1
        assert_eq!(result.width, 800);
        assert_eq!(result.height, 450); // 800 / (1920/1080) = 450
    }

    #[test]
    fn test_batch_processing() {
        let images = vec![
            (vec![0u8; 1000], "png".to_string()),
            (vec![1u8; 2000], "jpg".to_string()),
            (vec![2u8; 1500], "webp".to_string()),
        ];

        let processor = |data: &[u8], format: &str| -> ImageResult<ProcessingResult> {
            prepare_for_web(data, format, None, Some(80))
        };

        let results = batch_process_images(&images, processor);
        assert_eq!(results.len(), 3);

        // All should succeed (with our simplified implementation)
        for result in results {
            assert!(result.is_ok());
        }
    }
}

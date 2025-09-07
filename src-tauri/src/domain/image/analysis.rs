use crate::domain::image::{
    error::ImageResult,
    metadata::{ColorSpace, ImageMetadata, ImageType},
};

/// Image quality assessment result
#[derive(Debug, Clone)]
pub struct QualityAssessment {
    pub sharpness_score: f64, // 0.0 - 1.0
    pub noise_level: f64,     // 0.0 - 1.0
    pub contrast_score: f64,  // 0.0 - 1.0
    pub color_richness: f64,  // 0.0 - 1.0
    pub overall_quality: f64, // 0.0 - 1.0 weighted average
}

/// Color distribution analysis
#[derive(Debug, Clone)]
pub struct ColorAnalysis {
    pub dominant_colors: Vec<(u8, u8, u8)>, // RGB values of most frequent colors
    pub unique_color_estimate: u32,
    pub has_transparency_pixels: bool,
    pub average_brightness: f64, // 0.0 - 1.0
    pub color_variance: f64,     // 0.0 - 1.0
}

/// Compression potential analysis
#[derive(Debug, Clone)]
pub struct CompressionPotential {
    pub lossy_suitable: bool,
    pub estimated_savings_percent: f64,
    pub recommended_quality: u8,
    pub risk_level: RiskLevel,
}

#[derive(Debug, Clone, PartialEq)]
pub enum RiskLevel {
    Low,    // Safe to compress aggressively
    Medium, // Moderate compression recommended
    High,   // Conservative compression only
}

/// Analyze image quality metrics
pub fn assess_image_quality(metadata: &ImageMetadata) -> ImageResult<QualityAssessment> {
    // Simplified quality assessment based on metadata and basic analysis
    // Estimate sharpness based on compression ratio and format
    let sharpness_score = match metadata.format.to_lowercase().as_str() {
        "jpg" | "jpeg" => {
            let compression_ratio = metadata.compression_ratio();
            if compression_ratio > 0.1 {
                0.3 // Heavily compressed JPEG
            } else if compression_ratio > 0.05 {
                0.6 // Medium compression
            } else {
                0.9 // High quality JPEG
            }
        }
        "png" => 0.95,  // PNG is lossless
        "webp" => 0.85, // WebP generally good quality
        _ => 0.5,       // Unknown format
    };

    // Estimate noise level (inverse of quality for lossy formats)
    let noise_level = if matches!(metadata.format.to_lowercase().as_str(), "jpg" | "jpeg") {
        1.0 - sharpness_score
    } else {
        0.1 // Low noise for lossless formats
    };

    // Estimate contrast based on image type and size
    let contrast_score = match metadata.image_type {
        ImageType::Photo => 0.7,
        ImageType::Logo => 0.9, // High contrast logos
        ImageType::Graphic => 0.8,
        ImageType::Screenshot => 0.6,
        ImageType::Unknown => 0.5,
    };

    // Color richness based on color space and estimated complexity
    let color_richness = match metadata.color_space {
        ColorSpace::RGB | ColorSpace::RGBA => 0.8,
        ColorSpace::Grayscale | ColorSpace::GrayscaleAlpha => 0.3,
        ColorSpace::CMYK => 0.9,
        ColorSpace::YUV => 0.7,
    };

    // Calculate overall quality as weighted average
    let overall_quality = (sharpness_score * 0.4)
        + ((1.0 - noise_level) * 0.3)
        + (contrast_score * 0.2)
        + (color_richness * 0.1);

    Ok(QualityAssessment {
        sharpness_score,
        noise_level,
        contrast_score,
        color_richness,
        overall_quality,
    })
}

/// Analyze color distribution in image
pub fn analyze_colors(metadata: &ImageMetadata) -> ImageResult<ColorAnalysis> {
    // Simplified color analysis - in real implementation would sample pixels

    let pixel_count = metadata.dimensions.pixel_count();

    // Estimate unique colors based on image type and size
    let unique_color_estimate = match metadata.image_type {
        ImageType::Logo => {
            // Logos typically have few colors
            (pixel_count / 1000).clamp(2, 64) as u32
        }
        ImageType::Screenshot => {
            // Screenshots have moderate color variety
            (pixel_count / 100).clamp(16, 1024) as u32
        }
        ImageType::Photo => {
            // Photos have rich color palettes
            (pixel_count / 10).clamp(1000, 65536) as u32
        }
        ImageType::Graphic => {
            // Graphics vary widely
            (pixel_count / 50).clamp(32, 4096) as u32
        }
        ImageType::Unknown => {
            // Conservative estimate
            (pixel_count / 100).clamp(16, 2048) as u32
        }
    };

    // Generate some dominant colors (simplified)
    let dominant_colors = match metadata.image_type {
        ImageType::Logo => vec![(255, 255, 255), (0, 0, 0)], // Typical logo colors
        ImageType::Photo => vec![(128, 128, 128), (64, 64, 64), (192, 192, 192)],
        _ => vec![(128, 128, 128)], // Neutral colors
    };

    let has_transparency_pixels = metadata.has_transparency;

    // Estimate average brightness
    let average_brightness = match metadata.image_type {
        ImageType::Logo => 0.8,       // Logos often bright
        ImageType::Screenshot => 0.9, // UI elements often bright
        ImageType::Photo => 0.5,      // Photos vary
        ImageType::Graphic => 0.6,
        ImageType::Unknown => 0.5,
    };

    // Color variance based on type
    let color_variance = match metadata.image_type {
        ImageType::Logo => 0.3,       // Low variance
        ImageType::Photo => 0.8,      // High variance
        ImageType::Screenshot => 0.4, // Moderate variance
        ImageType::Graphic => 0.6,
        ImageType::Unknown => 0.5,
    };

    Ok(ColorAnalysis {
        dominant_colors,
        unique_color_estimate,
        has_transparency_pixels,
        average_brightness,
        color_variance,
    })
}

/// Analyze compression potential
pub fn analyze_compression_potential(
    metadata: &ImageMetadata,
    quality_assessment: &QualityAssessment,
    color_analysis: &ColorAnalysis,
) -> CompressionPotential {
    // Determine if lossy compression is suitable
    let lossy_suitable = determine_lossy_suitability(metadata, quality_assessment, color_analysis);

    // Estimate potential savings
    let estimated_savings_percent =
        estimate_savings_percent(metadata, quality_assessment, color_analysis);

    // Recommend quality level
    let recommended_quality = recommend_quality_level(metadata, quality_assessment, color_analysis);

    // Assess compression risk
    let risk_level = assess_compression_risk(metadata, quality_assessment, color_analysis);

    CompressionPotential {
        lossy_suitable,
        estimated_savings_percent,
        recommended_quality,
        risk_level,
    }
}

fn determine_lossy_suitability(
    metadata: &ImageMetadata,
    quality: &QualityAssessment,
    colors: &ColorAnalysis,
) -> bool {
    match metadata.image_type {
        ImageType::Photo => true,
        ImageType::Logo => false,
        ImageType::Screenshot => false,
        ImageType::Graphic => {
            // Complex graphics with many colors can handle lossy compression
            colors.unique_color_estimate > 256 && colors.color_variance > 0.5
        }
        ImageType::Unknown => {
            // Conservative approach: only if high color count and good existing quality
            colors.unique_color_estimate > 1000 && quality.overall_quality > 0.7
        }
    }
}

fn estimate_savings_percent(
    metadata: &ImageMetadata,
    quality: &QualityAssessment,
    colors: &ColorAnalysis,
) -> f64 {
    let base_savings = match metadata.format.to_lowercase().as_str() {
        "png" => {
            if colors.unique_color_estimate < 256 {
                20.0 // PNG with few colors
            } else {
                60.0 // PNG with many colors - good WebP candidate
            }
        }
        "jpg" | "jpeg" => {
            if quality.overall_quality > 0.8 {
                15.0 // High quality JPEG, limited savings
            } else {
                25.0 // Lower quality JPEG, modest savings
            }
        }
        "webp" => 5.0, // Already compressed well
        _ => 10.0,     // Conservative estimate
    };

    // Adjust based on image type
    let type_multiplier = match metadata.image_type {
        ImageType::Photo => 1.0,
        ImageType::Logo => 0.5,       // Less compressible
        ImageType::Screenshot => 0.7, // UI elements compress well
        ImageType::Graphic => 0.8,
        ImageType::Unknown => 0.6,
    };

    let result: f64 = base_savings * type_multiplier;
    result.clamp(5.0, 90.0)
}

fn recommend_quality_level(
    metadata: &ImageMetadata,
    quality: &QualityAssessment,
    _colors: &ColorAnalysis,
) -> u8 {
    match metadata.image_type {
        ImageType::Photo => {
            if quality.overall_quality > 0.9 {
                90 // Preserve high quality
            } else if quality.overall_quality > 0.7 {
                80 // Good balance
            } else {
                75 // Already degraded, conservative
            }
        }
        ImageType::Logo => 95,       // Preserve sharp edges
        ImageType::Screenshot => 85, // Balance quality and size
        ImageType::Graphic => 85,
        ImageType::Unknown => 80, // Safe default
    }
}

fn assess_compression_risk(
    metadata: &ImageMetadata,
    quality: &QualityAssessment,
    colors: &ColorAnalysis,
) -> RiskLevel {
    if metadata.image_type == ImageType::Logo
        || metadata.image_type == ImageType::Screenshot
        || colors.unique_color_estimate < 64
    {
        return RiskLevel::High;
    }

    if quality.overall_quality < 0.5 || metadata.compression_ratio() > 0.8 {
        return RiskLevel::High;
    }

    if quality.overall_quality > 0.8 && colors.unique_color_estimate > 1000 {
        RiskLevel::Low
    } else {
        RiskLevel::Medium
    }
}

/// Perform comprehensive image analysis
pub fn comprehensive_analysis(
    metadata: &ImageMetadata,
) -> ImageResult<(QualityAssessment, ColorAnalysis, CompressionPotential)> {
    let quality = assess_image_quality(metadata)?;
    let colors = analyze_colors(metadata)?;
    let compression = analyze_compression_potential(metadata, &quality, &colors);

    Ok((quality, colors, compression))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::image::metadata::{ColorSpace, Dimensions, ImageMetadata, ImageType};

    #[test]
    fn test_photo_analysis() {
        let dims = Dimensions::new(1920, 1080).unwrap();
        let mut metadata = ImageMetadata::new(
            "jpg".to_string(),
            dims,
            ColorSpace::RGB,
            500000, // 500KB
        );
        metadata.image_type = ImageType::Photo;

        let quality = assess_image_quality(&metadata).unwrap();
        assert!(quality.overall_quality > 0.0);

        let colors = analyze_colors(&metadata).unwrap();
        assert!(colors.unique_color_estimate > 1000);

        let compression = analyze_compression_potential(&metadata, &quality, &colors);
        assert!(compression.lossy_suitable);
        assert!(compression.estimated_savings_percent > 10.0);
    }

    #[test]
    fn test_logo_analysis() {
        let dims = Dimensions::new(128, 128).unwrap();
        let mut metadata = ImageMetadata::new(
            "png".to_string(),
            dims,
            ColorSpace::RGBA,
            5000, // 5KB
        );
        metadata.image_type = ImageType::Logo;
        metadata.has_transparency = true;

        let quality = assess_image_quality(&metadata).unwrap();
        let colors = analyze_colors(&metadata).unwrap();
        let compression = analyze_compression_potential(&metadata, &quality, &colors);

        assert!(!compression.lossy_suitable); // Logos should not use lossy
        assert_eq!(compression.risk_level, RiskLevel::High);
        assert!(compression.recommended_quality > 90);
    }

    #[test]
    fn test_screenshot_analysis() {
        let dims = Dimensions::new(1920, 1080).unwrap();
        let mut metadata = ImageMetadata::new(
            "png".to_string(),
            dims,
            ColorSpace::RGB,
            1000000, // 1MB
        );
        metadata.image_type = ImageType::Screenshot;

        let colors = analyze_colors(&metadata).unwrap();
        let quality = assess_image_quality(&metadata).unwrap();
        let compression = analyze_compression_potential(&metadata, &quality, &colors);

        assert!(!compression.lossy_suitable); // Screenshots should preserve UI clarity
        assert_eq!(compression.risk_level, RiskLevel::High);
    }

    #[test]
    fn test_comprehensive_analysis() {
        let dims = Dimensions::new(800, 600).unwrap();
        let mut metadata = ImageMetadata::new("png".to_string(), dims, ColorSpace::RGB, 200000);
        metadata.image_type = ImageType::Graphic;

        let result = comprehensive_analysis(&metadata);
        assert!(result.is_ok());

        let (quality, colors, compression) = result.unwrap();
        assert!(quality.overall_quality > 0.0);
        assert!(colors.unique_color_estimate > 0);
        assert!(compression.estimated_savings_percent > 0.0);
    }
}

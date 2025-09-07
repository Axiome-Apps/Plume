use crate::domain::image::error::{ImageError, ImageResult};
use serde::{Deserialize, Serialize};

/// Image dimensions
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Dimensions {
    pub width: u32,
    pub height: u32,
}

impl Dimensions {
    /// Create new dimensions
    pub fn new(width: u32, height: u32) -> ImageResult<Self> {
        if width == 0 || height == 0 {
            return Err(ImageError::InvalidDimensions(format!(
                "Dimensions cannot be zero: {}x{}",
                width, height
            )));
        }
        Ok(Dimensions { width, height })
    }

    /// Calculate total pixels
    pub fn pixel_count(&self) -> u64 {
        self.width as u64 * self.height as u64
    }

    /// Calculate aspect ratio
    pub fn aspect_ratio(&self) -> f64 {
        self.width as f64 / self.height as f64
    }

    /// Check if image is square
    pub fn is_square(&self) -> bool {
        self.width == self.height
    }

    /// Check if image is landscape
    pub fn is_landscape(&self) -> bool {
        self.width > self.height
    }

    /// Check if image is portrait
    pub fn is_portrait(&self) -> bool {
        self.height > self.width
    }
}

/// Color space information
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ColorSpace {
    RGB,
    RGBA,
    Grayscale,
    GrayscaleAlpha,
    CMYK,
    YUV,
}

impl ColorSpace {
    /// Get bytes per pixel for this color space
    pub fn bytes_per_pixel(&self) -> u8 {
        match self {
            ColorSpace::RGB => 3,
            ColorSpace::RGBA => 4,
            ColorSpace::Grayscale => 1,
            ColorSpace::GrayscaleAlpha => 2,
            ColorSpace::CMYK => 4,
            ColorSpace::YUV => 3,
        }
    }

    /// Check if color space has alpha channel
    pub fn has_alpha(&self) -> bool {
        matches!(self, ColorSpace::RGBA | ColorSpace::GrayscaleAlpha)
    }
}

/// Image type classification
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ImageType {
    Photo,      // Natural photos with gradients
    Logo,       // Simple graphics with few colors
    Graphic,    // Complex graphics/illustrations
    Screenshot, // UI screenshots
    Unknown,
}

/// Comprehensive image metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub format: String,
    pub dimensions: Dimensions,
    pub color_space: ColorSpace,
    pub bit_depth: u8,
    pub has_transparency: bool,
    pub estimated_colors: Option<u32>,
    pub image_type: ImageType,
    pub quality_estimate: Option<u8>,  // For JPEG
    pub compression_level: Option<u8>, // For PNG
    pub file_size_bytes: u64,
}

impl ImageMetadata {
    /// Create metadata from basic information
    pub fn new(
        format: String,
        dimensions: Dimensions,
        color_space: ColorSpace,
        file_size_bytes: u64,
    ) -> Self {
        ImageMetadata {
            format,
            dimensions,
            color_space: color_space.clone(),
            bit_depth: 8, // Default
            has_transparency: color_space.has_alpha(),
            estimated_colors: None,
            image_type: ImageType::Unknown,
            quality_estimate: None,
            compression_level: None,
            file_size_bytes,
        }
    }

    /// Calculate theoretical uncompressed size
    pub fn uncompressed_size_bytes(&self) -> u64 {
        self.dimensions.pixel_count() * self.color_space.bytes_per_pixel() as u64
    }

    /// Calculate current compression ratio
    pub fn compression_ratio(&self) -> f64 {
        let uncompressed = self.uncompressed_size_bytes() as f64;
        if uncompressed > 0.0 {
            self.file_size_bytes as f64 / uncompressed
        } else {
            0.0
        }
    }

    /// Estimate if image is suitable for lossy compression
    pub fn is_suitable_for_lossy(&self) -> bool {
        match self.image_type {
            ImageType::Photo => true,
            ImageType::Screenshot => false,
            ImageType::Logo => false,
            ImageType::Graphic => self.estimated_colors.map_or(true, |colors| colors > 256),
            ImageType::Unknown => self.dimensions.pixel_count() > 10000, // Heuristic
        }
    }

    /// Get recommended output format
    pub fn recommended_output_format(&self) -> &'static str {
        if self.is_suitable_for_lossy() {
            "webp"
        } else if self.has_transparency {
            "png"
        } else {
            "webp" // WebP can handle both lossy and lossless
        }
    }
}

/// Extract basic metadata from image data (placeholder implementation)
pub fn extract_metadata(data: &[u8], format: &str) -> ImageResult<ImageMetadata> {
    // This is a simplified implementation
    // In a real implementation, you'd use libraries like `image` crate

    let (width, height) = match format.to_lowercase().as_str() {
        "png" => extract_png_dimensions(data)?,
        "jpg" | "jpeg" => extract_jpeg_dimensions(data)?,
        "webp" => extract_webp_dimensions(data)?,
        _ => return Err(ImageError::UnsupportedFormat(format.to_string())),
    };

    let dimensions = Dimensions::new(width, height)?;
    let color_space = ColorSpace::RGB; // Simplified assumption

    Ok(ImageMetadata::new(
        format.to_string(),
        dimensions,
        color_space,
        data.len() as u64,
    ))
}

/// Classify image type based on metadata and simple analysis
pub fn classify_image_type(metadata: &ImageMetadata) -> ImageType {
    // Simple heuristics for classification
    let pixel_count = metadata.dimensions.pixel_count();

    // Very small images are likely logos
    if pixel_count < 10000 {
        return ImageType::Logo;
    }

    // Large images with standard photo aspect ratios
    if pixel_count > 1000000 {
        let aspect_ratio = metadata.dimensions.aspect_ratio();
        if (0.5..=2.0).contains(&aspect_ratio) {
            return ImageType::Photo;
        }
    }

    // Check for typical screenshot dimensions
    let width = metadata.dimensions.width;
    let height = metadata.dimensions.height;
    if is_typical_screen_resolution(width, height) {
        return ImageType::Screenshot;
    }

    // Default classification based on estimated complexity
    if let Some(colors) = metadata.estimated_colors {
        if colors < 64 {
            ImageType::Logo
        } else if colors < 1024 {
            ImageType::Graphic
        } else {
            ImageType::Photo
        }
    } else {
        ImageType::Unknown
    }
}

/// Check if dimensions match common screen resolutions
fn is_typical_screen_resolution(width: u32, height: u32) -> bool {
    let common_resolutions = [
        (1920, 1080),
        (1366, 768),
        (1024, 768),
        (1280, 720),
        (1440, 900),
        (1600, 900),
        (2560, 1440),
        (3840, 2160),
    ];

    common_resolutions
        .iter()
        .any(|(w, h)| *w == width && *h == height)
}

// Placeholder dimension extraction functions
// In a real implementation, these would parse the actual image headers

fn extract_png_dimensions(data: &[u8]) -> ImageResult<(u32, u32)> {
    if data.len() < 24 {
        return Err(ImageError::InvalidFormat("PNG data too short".to_string()));
    }

    // PNG signature check
    if &data[0..8] != b"\x89PNG\r\n\x1a\n" {
        return Err(ImageError::InvalidFormat(
            "Invalid PNG signature".to_string(),
        ));
    }

    // Extract dimensions from IHDR chunk (simplified)
    let width = u32::from_be_bytes([data[16], data[17], data[18], data[19]]);
    let height = u32::from_be_bytes([data[20], data[21], data[22], data[23]]);

    Ok((width, height))
}

fn extract_jpeg_dimensions(_data: &[u8]) -> ImageResult<(u32, u32)> {
    // Simplified placeholder - would need proper JPEG parsing
    Ok((1920, 1080)) // Default dimensions
}

fn extract_webp_dimensions(_data: &[u8]) -> ImageResult<(u32, u32)> {
    // Simplified placeholder - would need proper WebP parsing
    Ok((1920, 1080)) // Default dimensions
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dimensions() {
        let dims = Dimensions::new(1920, 1080).unwrap();
        assert_eq!(dims.pixel_count(), 2_073_600);
        assert_eq!(dims.aspect_ratio(), 1920.0 / 1080.0);
        assert!(dims.is_landscape());
        assert!(!dims.is_portrait());
        assert!(!dims.is_square());

        let square = Dimensions::new(100, 100).unwrap();
        assert!(square.is_square());
    }

    #[test]
    fn test_invalid_dimensions() {
        assert!(Dimensions::new(0, 100).is_err());
        assert!(Dimensions::new(100, 0).is_err());
    }

    #[test]
    fn test_color_space() {
        assert_eq!(ColorSpace::RGB.bytes_per_pixel(), 3);
        assert_eq!(ColorSpace::RGBA.bytes_per_pixel(), 4);
        assert!(ColorSpace::RGBA.has_alpha());
        assert!(!ColorSpace::RGB.has_alpha());
    }

    #[test]
    fn test_metadata_calculations() {
        let dims = Dimensions::new(100, 100).unwrap();
        let metadata = ImageMetadata::new("png".to_string(), dims, ColorSpace::RGB, 1000);

        assert_eq!(metadata.uncompressed_size_bytes(), 30000); // 100*100*3
        assert_eq!(metadata.compression_ratio(), 1000.0 / 30000.0);
        assert_eq!(metadata.recommended_output_format(), "webp");
    }

    #[test]
    fn test_lossy_suitability() {
        let dims = Dimensions::new(1000, 1000).unwrap();
        let mut metadata = ImageMetadata::new("jpg".to_string(), dims, ColorSpace::RGB, 100000);

        metadata.image_type = ImageType::Photo;
        assert!(metadata.is_suitable_for_lossy());

        metadata.image_type = ImageType::Logo;
        assert!(!metadata.is_suitable_for_lossy());

        metadata.image_type = ImageType::Screenshot;
        assert!(!metadata.is_suitable_for_lossy());
    }

    #[test]
    fn test_classify_image_type() {
        let small_dims = Dimensions::new(64, 64).unwrap();
        let small_metadata =
            ImageMetadata::new("png".to_string(), small_dims, ColorSpace::RGBA, 1000);

        assert_eq!(classify_image_type(&small_metadata, &[]), ImageType::Logo);

        let screenshot_dims = Dimensions::new(1920, 1080).unwrap();
        let screenshot_metadata =
            ImageMetadata::new("png".to_string(), screenshot_dims, ColorSpace::RGB, 100000);

        assert_eq!(
            classify_image_type(&screenshot_metadata, &[]),
            ImageType::Screenshot
        );
    }
}

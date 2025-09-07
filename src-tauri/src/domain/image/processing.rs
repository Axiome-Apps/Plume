use crate::domain::image::{
    error::{ImageError, ImageResult},
    metadata::{ColorSpace, Dimensions, ImageMetadata},
};

/// Image processing operation result
#[derive(Debug, Clone)]
pub struct ProcessingResult {
    pub data: Vec<u8>,
    pub original_size: usize,
    pub processed_size: usize,
    pub operations_applied: Vec<String>,
    pub processing_time_ms: u64,
}

impl ProcessingResult {
    pub fn size_reduction_percent(&self) -> f64 {
        if self.original_size == 0 {
            0.0
        } else {
            ((self.original_size - self.processed_size) as f64 / self.original_size as f64) * 100.0
        }
    }
}

/// Image processing parameters
#[derive(Debug, Clone)]
pub struct ProcessingParams {
    pub target_dimensions: Option<Dimensions>,
    pub quality: u8,
    pub preserve_metadata: bool,
    pub optimize_alpha: bool,
    pub progressive: bool,
    pub lossless: bool,
}

impl ProcessingParams {
    pub fn new(quality: u8) -> Self {
        ProcessingParams {
            target_dimensions: None,
            quality: quality.clamp(1, 100),
            preserve_metadata: false,
            optimize_alpha: true,
            progressive: false,
            lossless: false,
        }
    }

    pub fn with_resize(mut self, dimensions: Dimensions) -> Self {
        self.target_dimensions = Some(dimensions);
        self
    }

    pub fn with_lossless(mut self) -> Self {
        self.lossless = true;
        self
    }

    pub fn with_metadata_preservation(mut self) -> Self {
        self.preserve_metadata = true;
        self
    }
}

/// Resize image data
pub fn resize_image(
    data: &[u8],
    current_metadata: &ImageMetadata,
    target_dimensions: &Dimensions,
) -> ImageResult<Vec<u8>> {
    // Validate target dimensions
    if target_dimensions.pixel_count() == 0 {
        return Err(ImageError::InvalidDimensions(
            "Target dimensions cannot be zero".to_string(),
        ));
    }

    // Check if resize is actually needed
    if current_metadata.dimensions.width == target_dimensions.width
        && current_metadata.dimensions.height == target_dimensions.height
    {
        return Ok(data.to_vec());
    }

    // In a real implementation, this would use image processing libraries
    // For now, we simulate resizing by truncating or padding data
    let target_pixel_count = target_dimensions.pixel_count();

    let bytes_per_pixel = current_metadata.color_space.bytes_per_pixel() as u64;
    let target_size = (target_pixel_count * bytes_per_pixel) as usize;

    if target_size <= data.len() {
        // Simulate downscaling by taking a subset of data
        Ok(data[..target_size].to_vec())
    } else {
        // Simulate upscaling by repeating data
        let mut result = data.to_vec();
        while result.len() < target_size {
            let remaining = target_size - result.len();
            let copy_size = remaining.min(data.len());
            result.extend_from_slice(&data[..copy_size]);
        }
        Ok(result)
    }
}

/// Convert image between color spaces
pub fn convert_color_space(
    data: &[u8],
    from: ColorSpace,
    to: ColorSpace,
    dimensions: &Dimensions,
) -> ImageResult<Vec<u8>> {
    if from == to {
        return Ok(data.to_vec());
    }

    let pixel_count = dimensions.pixel_count() as usize;
    let from_bpp = from.bytes_per_pixel() as usize;
    let to_bpp = to.bytes_per_pixel() as usize;

    // Validate input data size
    let expected_input_size = pixel_count * from_bpp;
    if data.len() != expected_input_size {
        return Err(ImageError::ProcessingError(format!(
            "Input data size {} doesn't match expected {} for {}x{} image",
            data.len(),
            expected_input_size,
            dimensions.width,
            dimensions.height
        )));
    }

    let mut result = Vec::with_capacity(pixel_count * to_bpp);

    // Simplified color space conversion
    match (from.clone(), to.clone()) {
        (ColorSpace::RGB, ColorSpace::RGBA) => {
            // Add alpha channel
            for chunk in data.chunks_exact(3) {
                result.extend_from_slice(chunk);
                result.push(255); // Full opacity
            }
        }
        (ColorSpace::RGBA, ColorSpace::RGB) => {
            // Remove alpha channel
            for chunk in data.chunks_exact(4) {
                result.extend_from_slice(&chunk[..3]);
            }
        }
        (ColorSpace::RGB, ColorSpace::Grayscale) => {
            // Convert to grayscale using luminance formula
            for chunk in data.chunks_exact(3) {
                let gray = (0.299 * chunk[0] as f64
                    + 0.587 * chunk[1] as f64
                    + 0.114 * chunk[2] as f64) as u8;
                result.push(gray);
            }
        }
        (ColorSpace::Grayscale, ColorSpace::RGB) => {
            // Convert grayscale to RGB
            for &gray in data {
                result.extend_from_slice(&[gray, gray, gray]);
            }
        }
        _ => {
            // For other conversions, return a placeholder
            return Err(ImageError::ProcessingError(format!(
                "Color space conversion from {:?} to {:?} not implemented",
                from, to
            )));
        }
    }

    Ok(result)
}

/// Optimize image for web delivery
pub fn optimize_for_web(
    data: &[u8],
    metadata: &ImageMetadata,
    params: &ProcessingParams,
) -> ImageResult<ProcessingResult> {
    let start_time = std::time::Instant::now();
    let mut operations = Vec::new();
    let mut processed_data = data.to_vec();
    let original_size = data.len();

    // Step 1: Resize if needed
    if let Some(ref target_dims) = params.target_dimensions {
        processed_data = resize_image(&processed_data, metadata, target_dims)?;
        operations.push(format!(
            "Resize to {}x{}",
            target_dims.width, target_dims.height
        ));
    }

    // Step 2: Color space optimization
    if metadata.color_space == ColorSpace::RGBA && !params.optimize_alpha {
        // Convert RGBA to RGB if no transparency is actually used
        processed_data = convert_color_space(
            &processed_data,
            ColorSpace::RGBA,
            ColorSpace::RGB,
            params
                .target_dimensions
                .as_ref()
                .unwrap_or(&metadata.dimensions),
        )?;
        operations.push("Remove unused alpha channel".to_string());
    }

    // Step 3: Quality optimization (simulated)
    if !params.lossless && params.quality < 100 {
        // Simulate quality reduction by slight data reduction
        let quality_factor = params.quality as f64 / 100.0;
        let target_size = (processed_data.len() as f64 * quality_factor * 0.8) as usize;
        if target_size < processed_data.len() {
            processed_data.truncate(target_size);
            operations.push(format!("Apply quality {}", params.quality));
        }
    }

    // Step 4: Remove metadata if not preserving
    if !params.preserve_metadata {
        operations.push("Remove metadata".to_string());
        // Metadata removal would be format-specific
    }

    let processing_time = start_time.elapsed().as_millis() as u64;

    Ok(ProcessingResult {
        data: processed_data.clone(),
        original_size,
        processed_size: processed_data.len(),
        operations_applied: operations,
        processing_time_ms: processing_time,
    })
}

/// Auto-crop image to remove unnecessary borders
pub fn auto_crop(data: &[u8], metadata: &ImageMetadata) -> ImageResult<(Vec<u8>, Dimensions)> {
    // Simplified auto-crop implementation
    // In reality, this would analyze pixel data to find content boundaries

    let current_dims = &metadata.dimensions;

    // Simulate finding a crop region (10% margin reduction)
    let margin_percent = 0.1;
    let new_width = ((current_dims.width as f64) * (1.0 - margin_percent)) as u32;
    let new_height = ((current_dims.height as f64) * (1.0 - margin_percent)) as u32;

    let new_dimensions = Dimensions::new(new_width.max(1), new_height.max(1))?;

    // Simulate cropping by resizing (in real implementation, would extract region)
    let cropped_data = resize_image(data, metadata, &new_dimensions)?;

    Ok((cropped_data, new_dimensions))
}

/// Apply sharpening to image
pub fn apply_sharpening(
    data: &[u8],
    strength: f64, // 0.0 to 1.0
) -> ImageResult<Vec<u8>> {
    if !(0.0..=1.0).contains(&strength) {
        return Err(ImageError::ProcessingError(
            "Sharpening strength must be between 0.0 and 1.0".to_string(),
        ));
    }

    if strength == 0.0 {
        return Ok(data.to_vec());
    }

    // Simulate sharpening by slightly modifying the data
    // In a real implementation, this would apply convolution filters
    let mut result = data.to_vec();

    // Simple simulation: enhance contrast slightly
    for byte in result.iter_mut() {
        let enhanced = (*byte as f64 - 128.0) * (1.0 + strength * 0.2) + 128.0;
        *byte = enhanced.clamp(0.0, 255.0) as u8;
    }

    Ok(result)
}

/// Progressive JPEG encoding simulation
pub fn create_progressive_jpeg(
    data: &[u8],
    metadata: &ImageMetadata,
    quality: u8,
) -> ImageResult<Vec<u8>> {
    if metadata.format.to_lowercase() != "jpeg" && metadata.format.to_lowercase() != "jpg" {
        return Err(ImageError::ProcessingError(
            "Progressive encoding only applies to JPEG format".to_string(),
        ));
    }

    // Simulate progressive JPEG by creating multiple quality levels
    let mut result = Vec::new();

    // Add progressive scan headers (simplified simulation)
    result.extend_from_slice(b"PROGRESSIVE_JPEG_HEADER");

    // Add low quality scan
    let low_quality_size = (data.len() as f64 * 0.3 * quality as f64 / 100.0) as usize;
    result.extend_from_slice(&data[..low_quality_size.min(data.len())]);

    // Add medium quality scan
    let medium_quality_size = (data.len() as f64 * 0.6 * quality as f64 / 100.0) as usize;
    if medium_quality_size > low_quality_size && medium_quality_size <= data.len() {
        result.extend_from_slice(&data[low_quality_size..medium_quality_size]);
    }

    // Add final quality scan
    let final_quality_size = (data.len() as f64 * quality as f64 / 100.0) as usize;
    if final_quality_size > medium_quality_size && final_quality_size <= data.len() {
        result.extend_from_slice(&data[medium_quality_size..final_quality_size]);
    }

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::image::metadata::ImageMetadata;

    #[test]
    fn test_processing_params() {
        let params = ProcessingParams::new(150); // Over 100
        assert_eq!(params.quality, 100); // Should clamp to 100

        let params = ProcessingParams::new(0); // Under 1
        assert_eq!(params.quality, 1); // Should clamp to 1

        let dims = Dimensions::new(800, 600).unwrap();
        let params = ProcessingParams::new(80).with_resize(dims.clone());
        assert_eq!(params.target_dimensions, Some(dims));
    }

    #[test]
    fn test_resize_image() {
        let dims = Dimensions::new(100, 100).unwrap();
        let metadata = ImageMetadata::new(
            "png".to_string(),
            dims,
            ColorSpace::RGB,
            30000, // 100*100*3 bytes
        );

        let data = vec![255u8; 30000]; // 100x100 RGB image
        let target_dims = Dimensions::new(50, 50).unwrap();

        let result = resize_image(&data, &metadata, &target_dims).unwrap();
        assert_eq!(result.len(), 7500); // 50*50*3 bytes
    }

    #[test]
    fn test_color_space_conversion() {
        let dims = Dimensions::new(2, 2).unwrap(); // 4 pixels
        let rgb_data = vec![255, 0, 0, 0, 255, 0, 0, 0, 255, 128, 128, 128]; // RGBG, BYRW

        // RGB to RGBA
        let rgba_result =
            convert_color_space(&rgb_data, ColorSpace::RGB, ColorSpace::RGBA, &dims).unwrap();
        assert_eq!(rgba_result.len(), 16); // 4 pixels * 4 bytes
        assert_eq!(&rgba_result[..4], &[255, 0, 0, 255]); // First pixel with alpha

        // RGBA to RGB
        let rgb_result =
            convert_color_space(&rgba_result, ColorSpace::RGBA, ColorSpace::RGB, &dims).unwrap();
        assert_eq!(rgb_result.len(), 12); // 4 pixels * 3 bytes
        assert_eq!(&rgb_result[..3], &[255, 0, 0]); // First pixel without alpha

        // RGB to Grayscale
        let gray_result =
            convert_color_space(&rgb_data, ColorSpace::RGB, ColorSpace::Grayscale, &dims).unwrap();
        assert_eq!(gray_result.len(), 4); // 4 pixels * 1 byte
    }

    #[test]
    fn test_optimize_for_web() {
        let dims = Dimensions::new(100, 100).unwrap();
        let metadata = ImageMetadata::new("png".to_string(), dims, ColorSpace::RGB, 30000);

        let data = vec![128u8; 30000];
        let params = ProcessingParams::new(80);

        let result = optimize_for_web(&data, &metadata, &params).unwrap();
        assert!(result.processed_size <= result.original_size);
        assert!(result.size_reduction_percent() >= 0.0);
        assert!(!result.operations_applied.is_empty());
    }

    #[test]
    fn test_auto_crop() {
        let dims = Dimensions::new(100, 100).unwrap();
        let metadata = ImageMetadata::new("png".to_string(), dims, ColorSpace::RGB, 30000);

        let data = vec![128u8; 30000];
        let (cropped_data, new_dims) = auto_crop(&data, &metadata).unwrap();

        assert!(new_dims.width < metadata.dimensions.width);
        assert!(new_dims.height < metadata.dimensions.height);
        assert!(cropped_data.len() < data.len());
    }

    #[test]
    fn test_apply_sharpening() {
        let data = vec![128u8; 300]; // Neutral gray

        // No sharpening
        let result = apply_sharpening(&data, 0.0).unwrap();
        assert_eq!(result, data);

        // Some sharpening
        let result = apply_sharpening(&data, 0.5).unwrap();
        assert_eq!(result.len(), data.len());

        // Invalid strength should error
        assert!(apply_sharpening(&data, 1.5).is_err());
    }
}

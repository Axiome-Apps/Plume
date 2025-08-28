use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageInfo {
    pub original_size: u64,
    pub compressed_size: u64,
    pub format: String,
    pub path: String,
}

impl ImageInfo {
    pub fn new(path: String, format: String, original_size: u64) -> Self {
        Self {
            original_size,
            compressed_size: 0,
            format,
            path,
        }
    }

    pub fn with_compressed_size(mut self, compressed_size: u64) -> Self {
        self.compressed_size = compressed_size;
        self
    }

    pub fn savings_percent(&self) -> f64 {
        if self.original_size == 0 {
            return 0.0;
        }
        ((self.original_size - self.compressed_size) as f64 / self.original_size as f64) * 100.0
    }

    pub fn compression_ratio(&self) -> f64 {
        if self.original_size == 0 {
            return 1.0;
        }
        self.compressed_size as f64 / self.original_size as f64
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DroppedFile {
    pub name: String,
    pub data: Vec<u8>,
}

impl DroppedFile {
    pub fn new(name: String, data: Vec<u8>) -> Self {
        Self { name, data }
    }

    pub fn size(&self) -> usize {
        self.data.len()
    }

    pub fn extension(&self) -> Option<&str> {
        std::path::Path::new(&self.name)
            .extension()
            .and_then(|ext| ext.to_str())
    }

    pub fn is_image(&self) -> bool {
        match self.extension() {
            Some(ext) => matches!(ext.to_lowercase().as_str(), "png" | "jpg" | "jpeg" | "webp"),
            None => false,
        }
    }
}

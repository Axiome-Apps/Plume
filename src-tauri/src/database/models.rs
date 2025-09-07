use serde::{Deserialize, Serialize};

/// Représente un enregistrement de compression dans la base de données
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionRecord {
    pub id: Option<i64>,
    pub input_format: String,
    pub output_format: String,
    pub original_size: i64,
    pub compressed_size: i64,
    pub tool_version: Option<String>,
    pub source_type: String,
    pub timestamp: String,
}

impl CompressionRecord {
    pub fn new(
        input_format: String,
        output_format: String,
        original_size: i64,
        compressed_size: i64,
        tool_version: Option<String>,
        source_type: String,
    ) -> Self {
        Self {
            id: None,
            input_format,
            output_format,
            original_size,
            compressed_size,
            tool_version,
            source_type,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }

    /// Calcule le pourcentage de compression
    pub fn compression_percentage(&self) -> f64 {
        if self.original_size == 0 {
            return 0.0;
        }
        let reduction = self.original_size - self.compressed_size;
        (reduction as f64 / self.original_size as f64) * 100.0
    }
}

/// Données d'initialisation pour peupler la base avec des stats réalistes
#[derive(Debug, Deserialize)]
pub struct SeedData {
    pub compression_stats: Vec<CompressionRecord>,
}

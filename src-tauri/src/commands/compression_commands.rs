use crate::domain::{CompressionService, CompressionSettings, OutputFormat};
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

static COMPRESSION_SERVICE: OnceLock<CompressionService> = OnceLock::new();

fn get_compression_service() -> &'static CompressionService {
    COMPRESSION_SERVICE.get_or_init(|| {
        let mut service = CompressionService::new();
        service.register_compressor(OutputFormat::Png, crate::infrastructure::OxipngCompressor::default());
        service.register_compressor(OutputFormat::WebP, crate::infrastructure::WebpCompressor::default());
        service.register_compressor(OutputFormat::Jpeg, crate::infrastructure::JpegCompressor::default());
        service
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressImageRequest {
    pub file_path: String,
    pub quality: Option<u8>,
    pub format: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressImageResponse {
    pub success: bool,
    pub error: Option<String>,
    pub result: Option<CompressionResult>,
    pub output_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressionResult {
    pub original_size: u64,
    pub compressed_size: u64,
    pub savings_percent: f64,
}

/// Commande Tauri pour compresser une image
#[tauri::command]
pub async fn compress_image(request: CompressImageRequest) -> Result<CompressImageResponse, String> {
    let service = get_compression_service();
    
    // Lire le fichier
    let input_data = std::fs::read(&request.file_path)
        .map_err(|e| format!("Impossible de lire le fichier: {}", e))?;

    // Déterminer le format de sortie
    let format = match request.format.as_deref() {
        Some("png") => OutputFormat::Png,
        Some("jpeg") | Some("jpg") => OutputFormat::Jpeg,
        Some("webp") => OutputFormat::WebP,
        Some("auto") | None => {
            // Auto-détection du meilleur format
            match CompressionService::detect_format(&input_data) {
                Some(detected) => CompressionSettings::optimal_format_for_input(&detected),
                None => OutputFormat::WebP, // Fallback
            }
        }
        Some(f) => return Ok(CompressImageResponse {
            success: false,
            error: Some(format!("Format non supporté: {}", f)),
            result: None,
            output_path: None,
        }),
    };

    // Créer les paramètres de compression
    let settings = CompressionSettings::new(request.quality.unwrap_or(80), format);

    // Compresser
    match service.compress_image(&input_data, &settings) {
        Ok(compression_output) => {
            // Générer le nom du fichier de sortie
            let input_path = std::path::PathBuf::from(&request.file_path);
            let output_path = CompressionService::generate_output_path(&input_path, format);

            // Sauvegarder le fichier compressé
            match std::fs::write(&output_path, &compression_output.compressed_data) {
                Ok(_) => Ok(CompressImageResponse {
                    success: true,
                    error: None,
                    result: Some(CompressionResult {
                        original_size: compression_output.original_size,
                        compressed_size: compression_output.compressed_size,
                        savings_percent: compression_output.savings_percent,
                    }),
                    output_path: Some(output_path.to_string_lossy().to_string()),
                }),
                Err(e) => Ok(CompressImageResponse {
                    success: false,
                    error: Some(format!("Erreur sauvegarde: {}", e)),
                    result: Some(CompressionResult {
                        original_size: compression_output.original_size,
                        compressed_size: compression_output.compressed_size,
                        savings_percent: compression_output.savings_percent,
                    }),
                    output_path: None,
                }),
            }
        }
        Err(e) => Ok(CompressImageResponse {
            success: false,
            error: Some(format!("Compression échouée: {}", e)),
            result: None,
            output_path: None,
        }),
    }
}

/// Commande pour compresser plusieurs images en lot
#[tauri::command]
pub async fn compress_batch(
    file_paths: Vec<String>,
    quality: Option<u8>,
    format: Option<String>,
) -> Result<Vec<CompressImageResponse>, String> {
    let mut results = Vec::new();
    
    for file_path in file_paths {
        let request = CompressImageRequest {
            file_path,
            quality,
            format: format.clone(),
        };
        
        let result = compress_image(request).await?;
        results.push(result);
    }
    
    Ok(results)
}
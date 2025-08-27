use crate::domain::{FileService, DroppedFile};

/// Commande pour sauvegarder temporairement les fichiers droppés
#[tauri::command]
pub async fn save_dropped_files(files_data: Vec<DroppedFile>) -> Result<Vec<String>, String> {
    FileService::save_dropped_files(files_data)
        .await
        .map_err(|e| format!("Erreur sauvegarde fichiers droppés: {}", e))
}

/// Commande pour générer un preview base64 à partir d'un chemin de fichier
#[tauri::command]
pub async fn generate_preview(file_path: String) -> Result<String, String> {
    FileService::generate_preview(&file_path)
        .await
        .map_err(|e| format!("Erreur génération preview: {}", e))
}

/// Commande pour sauvegarder un fichier dans le dossier Downloads
#[tauri::command]
pub async fn save_to_downloads(file_path: String) -> Result<String, String> {
    FileService::save_to_downloads(&file_path)
        .await
        .map_err(|e| format!("Erreur sauvegarde dans Downloads: {}", e))
}

/// Commande pour sauvegarder tous les fichiers dans le dossier Downloads
#[tauri::command]
pub async fn save_all_to_downloads(file_paths: Vec<String>) -> Result<Vec<String>, String> {
    FileService::save_all_to_downloads(file_paths)
        .await
        .map_err(|e| format!("Erreur sauvegarde de tous les fichiers: {}", e))
}

/// Commande pour nettoyer les fichiers temporaires
#[tauri::command]
pub async fn cleanup_temp_files() -> Result<(), String> {
    FileService::cleanup_temp_files()
        .await
        .map_err(|e| format!("Erreur nettoyage fichiers temporaires: {}", e))
}
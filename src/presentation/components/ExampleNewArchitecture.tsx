/**
 * EXEMPLE d'utilisation de la nouvelle architecture DDD
 * 
 * Ce composant montre comment utiliser:
 * - Les entités (Image, CompressionSettings)
 * - Les services (ImageManagementService) 
 * - Les schemas Zod pour validation
 * - Le hook personnalisé useImageManagement
 */

import { useImageManagement } from "../hooks/useImageManagement";

export function ExampleNewArchitecture() {
  const {
    // State
    images,
    isProcessing,
    compressionSettings,
    
    // Computed
    stats,
    pendingImages,
    completedImages,
    hasPendingImages,
    hasCompletedImages,
    
    // Actions  
    handleFileSelection,
    handleExternalDrop,
    startCompression,
    downloadImage,
    downloadAllImages,
    removeImage,
    clearAllImages,
    
    // Settings
    toggleWebPConversion,
    toggleLossyMode,
  } = useImageManagement();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Nouvelle Architecture DDD</h1>
      
      {/* Stats avec calculs métier encapsulés */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Statistiques</h2>
        <p>Total: {stats.totalCount} images</p>
        <p>En attente: {stats.pendingCount}</p>
        <p>En cours: {stats.processingCount}</p>
        <p>Terminées: {stats.completedCount}</p>
        <p>Taille originale: {stats.totalOriginalSize} bytes</p>
        <p>Taille compressée: {stats.totalCompressedSize} bytes</p>
        <p>Économies: {stats.totalSavings}%</p>
      </div>

      {/* Paramètres avec entité CompressionSettings */}
      <div className="mb-6 p-4 bg-blue-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Paramètres</h2>
        <p>Format WebP: {compressionSettings.convertToWebP ? 'Oui' : 'Non'}</p>
        <p>Mode Lossy: {compressionSettings.lossyMode ? 'Oui' : 'Non'}</p>
        <p>Qualité: {compressionSettings.quality}%</p>
        <p>Format de sortie: {compressionSettings.outputFormat}</p>
        
        <div className="mt-2">
          <button 
            onClick={() => toggleWebPConversion(!compressionSettings.convertToWebP)}
            className="mr-2 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Toggle WebP
          </button>
          <button 
            onClick={() => toggleLossyMode(!compressionSettings.lossyMode)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Toggle Lossy
          </button>
        </div>
      </div>

      {/* Actions avec services métier */}
      <div className="mb-6 p-4 bg-green-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Actions</h2>
        
        <div className="space-x-2">
          <button 
            onClick={startCompression}
            disabled={!hasPendingImages || isProcessing}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            {isProcessing ? 'Compression...' : `Compresser ${pendingImages.length} images`}
          </button>
          
          <button 
            onClick={downloadAllImages}
            disabled={!hasCompletedImages}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            Télécharger {completedImages.length} images
          </button>
          
          <button 
            onClick={clearAllImages}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Vider
          </button>
        </div>
      </div>

      {/* Liste des images avec entités Image */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Images ({images.length})</h2>
        {images.map((image) => (
          <div 
            key={image.id} 
            className={`p-3 border rounded ${
              image.isPending() ? 'bg-yellow-50' :
              image.isProcessing() ? 'bg-blue-50' :
              'bg-green-50'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{image.name}</p>
                <p className="text-sm text-gray-600">
                  {image.getFormattedOriginalSize()} • {image.format} • {image.status}
                </p>
                {image.isCompleted() && (
                  <p className="text-sm text-green-600">
                    → {image.getFormattedCompressedSize()} ({image.data.savings}% économisé)
                  </p>
                )}
              </div>
              
              <div className="space-x-2">
                {image.isCompleted() && (
                  <button
                    onClick={() => downloadImage(image)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded"
                  >
                    Télécharger
                  </button>
                )}
                <button
                  onClick={() => removeImage(image)}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Aucune image. Utilisez le drag & drop ou la sélection de fichiers.</p>
        </div>
      )}
    </div>
  );
}

export default ExampleNewArchitecture;
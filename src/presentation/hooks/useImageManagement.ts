import { useState, useCallback, useMemo } from "react";
import { Image } from "../../domain/entities/Image";
import { CompressionSettings } from "../../domain/entities/CompressionSettings";
import { ImageManagementService } from "../../domain/services/ImageManagementService";
import { ImageCompressionService } from "../../domain/services/ImageCompressionService";
import { tauriCommands } from "../../infrastructure/tauri/tauriCommands";

/**
 * Hook personnalisé pour la gestion des images avec architecture DDD
 */
export function useImageManagement() {
  // States
  const [images, setImages] = useState<Image[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressionSettings, setCompressionSettings] = useState(() => 
    CompressionSettings.createDefault()
  );

  // Services (memoized pour éviter les re-créations)
  const services = useMemo(() => {
    const compressionService = new ImageCompressionService(tauriCommands);
    const managementService = new ImageManagementService(compressionService);
    return { compressionService, managementService };
  }, []);

  // Computed values
  const stats = useMemo(() => 
    services.managementService.getStats(images), 
    [images, services.managementService]
  );

  const pendingImages = useMemo(() => 
    services.managementService.filterImagesByStatus(images, 'pending'),
    [images, services.managementService]
  );

  const processingImages = useMemo(() =>
    services.managementService.filterImagesByStatus(images, 'processing'),
    [images, services.managementService]
  );

  const completedImages = useMemo(() =>
    services.managementService.filterImagesByStatus(images, 'completed'),
    [images, services.managementService]
  );

  const hasPendingImages = pendingImages.length > 0;
  const hasCompletedImages = completedImages.length > 0;
  const hasAnyImages = images.length > 0;

  // Actions
  const handleFileSelection = useCallback(async (files: File[]) => {
    try {
      const newImages = await services.managementService.handleFileSelection(
        files, 
        compressionSettings
      );
      
      if (newImages.length > 0) {
        setImages(prev => [...prev, ...newImages]);
        console.log("📋 Images ajoutées à la liste:", newImages.length);
      }
    } catch (error) {
      console.error("❌ Erreur sélection fichiers:", error);
    }
  }, [services.managementService, compressionSettings]);

  const handleExternalDrop = useCallback(async (filePaths: string[]) => {
    try {
      const newImages = await services.managementService.handleExternalDrop(
        filePaths, 
        compressionSettings
      );
      
      if (newImages.length > 0) {
        setImages(prev => [...prev, ...newImages]);
        console.log("📋 Images ajoutées depuis drag&drop externe:", newImages.length);
      }
    } catch (error) {
      console.error("❌ Erreur drag&drop externe:", error);
    }
  }, [services.managementService, compressionSettings]);

  const startCompression = useCallback(async () => {
    if (pendingImages.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      console.log("🔄 Début compression...");
      const startTime = Date.now();
      
      const results = await services.managementService.startCompression(
        images,
        compressionSettings,
        {
          onImageStart: (image, index) => {
            console.log(`📸 Compression ${index + 1}/${pendingImages.length}: ${image.name}`);
            
            // Mettre à jour l'image en processing
            setImages(prev => prev.map(img => 
              img.id === image.id ? image.toProcessing(0) : img
            ));
          },
          onImageComplete: (compressedImage, index) => {
            console.log(`✅ Compression terminée: ${compressedImage.name}`);
            
            // Mettre à jour avec l'image compressée
            setImages(prev => prev.map(img => 
              img.id === compressedImage.id ? compressedImage : img
            ));
          },
          onImageError: (image, error, index) => {
            console.error(`❌ Erreur compression ${image.name}:`, error);
            
            // Remettre en pending
            setImages(prev => prev.map(img => 
              img.id === image.id ? image : img
            ));
          },
          onProgress: (completedCount, totalCount) => {
            console.log(`📊 Progression: ${completedCount}/${totalCount}`);
          }
        }
      );
      
      const totalTime = Date.now() - startTime;
      console.log(`📊 Temps total de compression: ${totalTime}ms`);
      
      // Les résultats sont déjà mis à jour via les callbacks
      
    } catch (error) {
      console.error("❌ Erreur lors de la compression:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [images, pendingImages, compressionSettings, isProcessing, services.managementService]);

  const downloadImage = useCallback(async (image: Image) => {
    try {
      console.log("📥 Téléchargement de:", image.name);
      const downloadPath = await services.managementService.downloadImage(image);
      console.log("✅ Fichier sauvegardé dans Downloads:", downloadPath);
      // TODO: Afficher une notification de succès
    } catch (error) {
      console.error("❌ Erreur téléchargement:", error);
      // TODO: Afficher une notification d'erreur
    }
  }, [services.managementService]);

  const downloadAllImages = useCallback(async () => {
    try {
      console.log("📥 Téléchargement de tous les fichiers...");
      const downloadPaths = await services.managementService.downloadAllImages(images);
      console.log("✅ Tous les fichiers sauvegardés dans Downloads:", downloadPaths);
      // TODO: Afficher une notification de succès
    } catch (error) {
      console.error("❌ Erreur téléchargement multiple:", error);
      // TODO: Afficher une notification d'erreur
    }
  }, [images, services.managementService]);

  const removeImage = useCallback((imageToRemove: Image) => {
    const updatedImages = services.managementService.removeImage(images, imageToRemove);
    setImages(updatedImages);
    console.log("🗑️ Image supprimée:", imageToRemove.name);
  }, [images, services.managementService]);

  const clearAllImages = useCallback(() => {
    const clearedImages = services.managementService.clearAllImages();
    setImages(clearedImages);
    console.log("🗑️ Toutes les images supprimées");
  }, [services.managementService]);

  // Settings actions
  const updateCompressionSettings = useCallback((settings: CompressionSettings) => {
    setCompressionSettings(settings);
  }, []);

  const toggleWebPConversion = useCallback((convertToWebP: boolean) => {
    setCompressionSettings(prev => prev.withKeepOriginalFormat(!convertToWebP));
  }, []);

  const toggleLossyMode = useCallback((lossyMode: boolean) => {
    setCompressionSettings(prev => prev.withLossyMode(lossyMode));
  }, []);

  const setQuality = useCallback((quality: number) => {
    setCompressionSettings(prev => prev.withQuality(quality));
  }, []);

  return {
    // State
    images,
    isProcessing,
    compressionSettings,
    
    // Computed
    stats,
    pendingImages,
    processingImages,
    completedImages,
    hasPendingImages,
    hasCompletedImages,
    hasAnyImages,
    
    // Actions
    handleFileSelection,
    handleExternalDrop,
    startCompression,
    downloadImage,
    downloadAllImages,
    removeImage,
    clearAllImages,
    
    // Settings actions
    updateCompressionSettings,
    toggleWebPConversion,
    toggleLossyMode,
    setQuality,
  };
}
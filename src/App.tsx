import { useState, useEffect } from "react";
import { getCurrentWebview } from '@tauri-apps/api/webview';
import AppLayout from "./components/templates/AppLayout";
import DropZone from "./components/organisms/DropZone";
import UnifiedImageList from "./components/organisms/UnifiedImageList";
import ProgressOverlay from "./components/molecules/ProgressOverlay";
import { compressImage, saveToDownloads, saveAllToDownloads, generatePreview } from "./utils/tauri";
import { ImageData, PendingImage, ProcessingImage, CompletedImage } from "./types/image";

function App() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [averageCompressionTime, setAverageCompressionTime] = useState(800); // ms par image
  const [keepOriginalFormat, setKeepOriginalFormat] = useState(false); // false = convert to WebP, true = keep original
  const [lossyMode, setLossyMode] = useState(true); // true = lossy, false = lossless (only for WebP)

  // Helper functions pour filtrer les images par statut
  const pendingImages = images.filter((img): img is PendingImage => img.status === 'pending');
  const processingImages = images.filter((img): img is ProcessingImage => img.status === 'processing');
  const completedImages = images.filter((img): img is CompletedImage => img.status === 'completed');
  const hasAnyImages = images.length > 0;

  // Setup global drag & drop listeners
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupGlobalDragListeners = async () => {
      // Listen for file drops from Tauri v2 webview API
      const webview = getCurrentWebview();
      unlisten = await webview.onDragDropEvent(async (event) => {
        console.log('🎯 Tauri v2 drag-drop event:', event);
        
        if (event.payload.type === 'drop' && event.payload.paths && Array.isArray(event.payload.paths)) {
          const filePaths = event.payload.paths as string[];
          console.log('📁 Files dropped globally:', filePaths);
          
          // Filter for image files
          const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
          const imageFiles = filePaths.filter(path => 
            imageExtensions.some(ext => path.toLowerCase().endsWith(ext))
          );
          
          if (imageFiles.length > 0) {
            try {
              // Generate previews
              const filesWithPreviews = await Promise.all(
                imageFiles.map(async (path) => {
                  const preview = await generatePreview(path);
                  return {
                    path,
                    preview,
                  };
                })
              );
              
              // Use the same handler as DropZone
              handleFilesSelected(filesWithPreviews);
            } catch (error) {
              console.error("❌ Erreur traitement fichiers drag&drop global:", error);
            }
          }
        }
      });
    };

    setupGlobalDragListeners();

    return () => {
      unlisten?.();
    };
  }, []);

  // Fonction d'estimation de compression intelligente
  const getEstimatedCompression = (format: string) => {
    const formatLower = format.toLowerCase();
    
    if (!keepOriginalFormat) {
      if (formatLower === 'png') {
        return lossyMode ? { percent: 98, ratio: 0.02 } : { percent: 43, ratio: 0.57 };
      } else if (['jpg', 'jpeg'].includes(formatLower)) {
        return { percent: 45, ratio: 0.55 }; // JPEG -> WebP toujours lossy
      }
      return { percent: 20, ratio: 0.80 }; // WebP -> WebP
    } else {
      // Garder format original
      if (formatLower === 'png') {
        return { percent: 15, ratio: 0.85 }; // PNG oxipng
      } else if (['jpg', 'jpeg'].includes(formatLower)) {
        return { percent: 25, ratio: 0.75 }; // JPEG optimisation
      }
      return { percent: 10, ratio: 0.90 }; // WebP minimal
    }
  };

  const handleFilesSelected = async (fileData: { path: string; preview: string }[]) => {
    console.log("📁 Fichiers sélectionnés:", fileData);

    // Créer les nouvelles images en statut pending
    const newPendingImages: PendingImage[] = await Promise.all(
      fileData.map(async ({ path, preview }) => {
        const fileName = path.split("/").pop() || "image";
        const ext = fileName.toLowerCase().split('.').pop() || '';
        
        // Obtenir la taille du fichier (approximation depuis le base64)
        const originalSize = Math.round((preview.length * 3) / 4);
        
        return {
          id: `${Date.now()}-${Math.random()}`, // ID unique
          name: fileName,
          originalSize,
          format: ext.toUpperCase(),
          preview,
          path,
          status: 'pending' as const,
          estimatedCompression: getEstimatedCompression(ext),
        };
      })
    );

    // Ajouter les nouvelles images à la liste
    setImages(prev => [...prev, ...newPendingImages]);
    console.log("📋 Images ajoutées à la liste:", newPendingImages.length);
  };

  const handleDownload = async (image: CompletedImage) => {
    if (!image.outputPath) {
      console.error("Pas de chemin de fichier pour:", image.name);
      return;
    }

    try {
      console.log("📥 Téléchargement de:", image.name);
      const downloadPath = await saveToDownloads(image.outputPath);
      console.log("✅ Fichier sauvegardé dans Downloads:", downloadPath);
      // TODO: Afficher une notification de succès
    } catch (error) {
      console.error("❌ Erreur téléchargement:", error);
      // TODO: Afficher une notification d'erreur
    }
  };

  const handleDownloadAll = async () => {
    const completedImagesWithPaths = completedImages.filter(img => img.outputPath);
    const filePaths = completedImagesWithPaths.map(img => img.outputPath!);

    if (filePaths.length === 0) {
      console.error("Aucun fichier à télécharger");
      return;
    }

    try {
      console.log("📥 Téléchargement de tous les fichiers...");
      const downloadPaths = await saveAllToDownloads(filePaths);
      console.log("✅ Tous les fichiers sauvegardés dans Downloads:", downloadPaths);
      // TODO: Afficher une notification de succès
    } catch (error) {
      console.error("❌ Erreur téléchargement multiple:", error);
      // TODO: Afficher une notification d'erreur
    }
  };

  const handleRemoveImage = (imageToRemove: ImageData) => {
    setImages(prev => prev.filter(img => img.id !== imageToRemove.id));
    console.log("🗑️ Image supprimée:", imageToRemove.name);
  };

  const handleCompress = async () => {
    if (pendingImages.length === 0) return;
    
    setIsProcessing(true);

    try {
      console.log("🔄 Début compression...");
      const startTime = Date.now();
      
      console.log(`⏱️ Compression de ${pendingImages.length} image(s)`);

      for (let i = 0; i < pendingImages.length; i++) {
        const pendingImage = pendingImages[i];
        console.log(`📸 Compression ${i + 1}/${pendingImages.length}: ${pendingImage.name}`);

        // 1. Passer l'image en mode "processing"
        setImages(prev => prev.map(img => 
          img.id === pendingImage.id 
            ? { ...img, status: 'processing' as const, progress: 0 } as ProcessingImage
            : img
        ));

        // 2. Simuler le progress (on pourrait l'améliorer avec de vrais callbacks)
        const progressInterval = setInterval(() => {
          setImages(prev => prev.map(img => 
            img.id === pendingImage.id && img.status === 'processing'
              ? { ...img, progress: Math.min(90, img.progress + Math.random() * 20) } as ProcessingImage
              : img
          ));
        }, 200);

        try {
          const imageStartTime = Date.now();
          
          // Logique de format
          const getOutputFormat = (fileName: string): 'png' | 'jpeg' | 'webp' => {
            const ext = fileName.toLowerCase().split('.').pop();
            if (!keepOriginalFormat) return 'webp';
            if (ext === 'png') return 'png';
            if (ext === 'webp') return 'webp';
            return 'jpeg';
          };

          const outputFormat = getOutputFormat(pendingImage.name);
          
          let quality: number;
          if (outputFormat === 'webp') {
            quality = lossyMode ? 90 : 100;
          } else if (outputFormat === 'jpeg') {
            quality = 85;
          } else {
            quality = 100;
          }
          
          const result = await compressImage({ 
            file_path: pendingImage.path, 
            quality, 
            format: outputFormat 
          });
          
          clearInterval(progressInterval);
          
          const imageEndTime = Date.now();
          const actualTime = imageEndTime - imageStartTime;
          
          console.log(`⏱️ Temps réel pour ${pendingImage.name}: ${actualTime}ms`);

          if (result.success && result.result) {
            // 3. Passer l'image en mode "completed"
            setImages(prev => prev.map(img => 
              img.id === pendingImage.id 
                ? {
                    ...img,
                    status: 'completed' as const,
                    compressedSize: result.result!.compressed_size,
                    savings: Math.round(result.result!.savings_percent),
                    outputPath: result.output_path,
                  } as CompletedImage
                : img
            ));
            console.log(`✅ Compression terminée: ${pendingImage.name}`);
          } else {
            clearInterval(progressInterval);
            console.error(`❌ Erreur compression ${pendingImage.name}:`, result.error);
            // Remettre en pending en cas d'erreur
            setImages(prev => prev.map(img => 
              img.id === pendingImage.id 
                ? { ...img, status: 'pending' } as PendingImage
                : img
            ));
          }
        } catch (error) {
          clearInterval(progressInterval);
          console.error(`❌ Erreur compression ${pendingImage.name}:`, error);
          // Remettre en pending en cas d'erreur
          setImages(prev => prev.map(img => 
            img.id === pendingImage.id 
              ? { ...img, status: 'pending' } as PendingImage
              : img
          ));
        }
      }
      
      const totalActualTime = Date.now() - startTime;
      const actualTimePerImage = totalActualTime / pendingImages.length;
      const newAverage = Math.round((averageCompressionTime + actualTimePerImage) / 2);
      setAverageCompressionTime(newAverage);
      
      console.log(`📊 Temps réel total: ${totalActualTime}ms`);
      console.log(`📊 Nouvelle moyenne: ${newAverage}ms par image`);

    } catch (error) {
      console.error("❌ Erreur lors de la compression:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setImages([]);
    console.log("🗑️ Toutes les images supprimées");
  };

  return (
    <AppLayout>
      {!hasAnyImages ? (
        <DropZone onFilesDropped={handleFilesSelected} />
      ) : (
        <UnifiedImageList
          images={images}
          onCompress={handleCompress}
          onClear={handleClear}
          onDownload={handleDownload}
          onDownloadAll={handleDownloadAll}
          onRemoveImage={handleRemoveImage}
          convertToWebP={!keepOriginalFormat}
          onConvertToWebPChange={(webp) => setKeepOriginalFormat(!webp)}
          lossyMode={lossyMode}
          onLossyModeChange={setLossyMode}
          isProcessing={isProcessing}
        />
      )}

      {/* Progress overlay globale - on peut la garder ou la supprimer au profit des progress individuels */}
      <ProgressOverlay
        isVisible={isProcessing && processingImages.length > 1}
        message="Compression en cours..."
        progress={0}
      />
    </AppLayout>
  );
}

export default App;

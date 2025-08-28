import React from "react";
import Button from "../atoms/Button";
import Icon from "../atoms/Icon";
import ImageCard from "../molecules/ImageCard";
import { ImageData, PendingImage, ProcessingImage, CompletedImage } from "../../types/image";

interface UnifiedImageListProps {
  images: ImageData[];
  onCompress: () => void;
  onClear: () => void;
  onDownload: (image: CompletedImage) => void;
  onDownloadAll: () => void;
  onRemoveImage: (image: ImageData) => void;
  convertToWebP: boolean;
  onConvertToWebPChange: (convert: boolean) => void;
  lossyMode: boolean;
  onLossyModeChange: (lossy: boolean) => void;
  isProcessing: boolean;
  className?: string;
}

const UnifiedImageList: React.FC<UnifiedImageListProps> = ({
  images,
  onCompress,
  onClear,
  onDownload,
  onDownloadAll,
  onRemoveImage,
  convertToWebP,
  onConvertToWebPChange,
  lossyMode,
  onLossyModeChange,
  isProcessing,
  className = "",
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Analyse des états
  const pendingImages = images.filter((img): img is PendingImage => img.status === 'pending');
  const processingImages = images.filter((img): img is ProcessingImage => img.status === 'processing');
  const completedImages = images.filter((img): img is CompletedImage => img.status === 'completed');

  // Analyse des types
  const hasPNG = images.some(img => img.format.toLowerCase() === 'png');
  const hasWebP = images.some(img => img.format.toLowerCase() === 'webp');

  const totalSize = images.reduce((sum, img) => sum + img.originalSize, 0);
  const hasPendingImages = pendingImages.length > 0;
  const hasCompletedImages = completedImages.length > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête avec stats et contrôles */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {hasPendingImages ? 'Images à compresser' : 'Images compressées'}
            </h2>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <span>{images.length} image{images.length > 1 ? 's' : ''}</span>
              <span>{formatFileSize(totalSize)} au total</span>
              {pendingImages.length > 0 && <span className="text-orange-600">{pendingImages.length} en attente</span>}
              {processingImages.length > 0 && <span className="text-blue-600">{processingImages.length} en cours</span>}
              {completedImages.length > 0 && <span className="text-green-600">{completedImages.length} terminées</span>}
            </div>
          </div>

          {/* Controls - Seulement si on a des images pending */}
          {hasPendingImages && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* Container pour les switches avec largeur fixe */}
              <div className={`flex flex-col sm:flex-row gap-3 flex-1 ${
                convertToWebP ? 'justify-between' : 'justify-start'
              }`}>
                {/* Switch Format WebP (PREMIER - toujours visible) */}
                <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3 flex-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={convertToWebP}
                      onChange={(e) => onConvertToWebPChange(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`relative w-12 h-6 rounded-full transition-colors ${
                      convertToWebP ? 'bg-green-500' : 'bg-slate-300'
                    }`}>
                      <div className={`absolute w-5 h-5 bg-white rounded-full shadow-md transition-transform top-0.5 ${
                        convertToWebP ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {convertToWebP ? 'WebP' : 'Original'}
                    </span>
                  </label>
                  
                  {/* Tooltip Format */}
                  <div className="relative group">
                    <div className="w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold cursor-help">
                      ?
                    </div>
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      <div className="text-center">
                        <div className="font-semibold mb-1">Format de sortie</div>
                        <div>WebP: Format moderne, -50% plus petit</div>
                        <div>Original: PNG oxipng (-15%), JPEG optimisé (-25%)</div>
                        {hasPNG && <div className="text-green-300">✓ PNG détectés: WebP très efficace</div>}
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
                    </div>
                  </div>
                  
                  {/* Badge Recommandé */}
                  {convertToWebP && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                      Recommandé
                    </span>
                  )}
                </div>

                {/* Switch Lossy/Lossless (DEUXIÈME - seulement si WebP et PNG/WebP présents) */}
                {convertToWebP && (hasPNG || hasWebP) && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lossyMode}
                        onChange={(e) => onLossyModeChange(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`relative w-12 h-6 rounded-full transition-colors ${
                        lossyMode ? 'bg-blue-500' : 'bg-slate-300'
                      }`}>
                        <div className={`absolute w-5 h-5 bg-white rounded-full shadow-md transition-transform top-0.5 ${
                          lossyMode ? 'translate-x-6' : 'translate-x-0.5'
                        }`} />
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {lossyMode ? 'Lossy' : 'Lossless'}
                      </span>
                    </label>
                    
                    {/* Tooltip Qualité */}
                    <div className="relative group">
                      <div className="w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold cursor-help">
                        ?
                      </div>
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        <div className="text-center">
                          <div className="font-semibold mb-1">Qualité WebP</div>
                          <div>Lossy: Ultra compact (-98%) mais léger flou</div>
                          <div>Lossless: Qualité parfaite (-43%)</div>
                          <div className="text-yellow-300">⚠️ Ne s'applique qu'aux PNG</div>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={onClear}
                  disabled={isProcessing}
                >
                  <Icon name="trash" size={16} className="mr-2" />
                  Vider
                </Button>
                
                {hasPendingImages && (
                  <Button
                    onClick={onCompress}
                    disabled={isProcessing || pendingImages.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Icon name="download" size={16} className="mr-2" />
                    {isProcessing ? 'Compression...' : `Compresser ${pendingImages.length} image${pendingImages.length > 1 ? 's' : ''}`}
                  </Button>
                )}
                
                {hasCompletedImages && (
                  <Button
                    onClick={onDownloadAll}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Icon name="download" size={16} className="mr-2" />
                    Télécharger tout ({completedImages.length})
                  </Button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Liste des images avec ImageCard */}
      <div className="space-y-4">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={{
              ...image,
              status: image.status,
              ...(image.status === 'pending' && { estimatedCompression: image.estimatedCompression }),
              ...(image.status === 'processing' && { progress: image.progress }),
              ...(image.status === 'completed' && { 
                compressedSize: image.compressedSize, 
                savings: image.savings, 
                outputPath: image.outputPath 
              }),
            } as any} // Type assertion needed due to union complexity
            onDownload={image.status === 'completed' ? onDownload : undefined}
            onRemove={onRemoveImage}
            convertToWebP={convertToWebP}
          />
        ))}
      </div>

      {/* Bouton Recommencer - En dessous de la liste quand tout est terminé */}
      {!hasPendingImages && !isProcessing && hasCompletedImages && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 text-center">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              🎉 Toutes les images ont été compressées avec succès !
            </h3>
            <p className="text-slate-600">
              Vous pouvez télécharger vos images ou recommencer avec de nouvelles images.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button
              onClick={onDownloadAll}
              className="bg-green-600 hover:bg-green-700"
            >
              <Icon name="download" size={16} className="mr-2" />
              Télécharger tout ({completedImages.length})
            </Button>
            
            <Button
              variant="secondary"
              onClick={onClear}
            >
              <Icon name="trash" size={16} className="mr-2" />
              Recommencer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedImageList;
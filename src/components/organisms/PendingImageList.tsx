import Button from "../atoms/Button";
import Icon from "../atoms/Icon";

interface ImageToCompress {
  name: string;
  originalSize: number;
  format: string;
  preview: string;
  path: string;
}

interface PendingImageListProps {
  images: ImageToCompress[];
  onCompress: () => void;
  onClear: () => void;
  convertToWebP: boolean;
  onConvertToWebPChange: (convert: boolean) => void;
  lossyMode: boolean;
  onLossyModeChange: (lossy: boolean) => void;
  isProcessing: boolean;
  className?: string;
}

const PendingImageList: React.FC<PendingImageListProps> = ({
  images,
  onCompress,
  onClear,
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

  const totalSize = images.reduce((sum, img) => sum + img.originalSize, 0);
  
  // Analyse des types d'images
  const hasPNG = images.some(img => img.format.toLowerCase() === 'png');
  const hasJPEG = images.some(img => ['jpg', 'jpeg'].includes(img.format.toLowerCase()));
  const hasWebP = images.some(img => img.format.toLowerCase() === 'webp');
  
  // Estimations de compression intelligentes
  const getEstimatedCompression = (image: ImageToCompress) => {
    const format = image.format.toLowerCase();
    
    if (convertToWebP) {
      if (format === 'png') {
        return lossyMode ? { percent: 98, ratio: 0.02 } : { percent: 43, ratio: 0.57 };
      } else if (['jpg', 'jpeg'].includes(format)) {
        return { percent: 45, ratio: 0.55 }; // JPEG -> WebP toujours lossy
      }
      return { percent: 20, ratio: 0.80 }; // WebP -> WebP
    } else {
      // Garder format original
      if (format === 'png') {
        return { percent: 15, ratio: 0.85 }; // PNG oxipng
      } else if (['jpg', 'jpeg'].includes(format)) {
        return { percent: 25, ratio: 0.75 }; // JPEG optimisation
      }
      return { percent: 10, ratio: 0.90 }; // WebP minimal
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête avec stats et actions */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Images à compresser
            </h2>
            <p className="text-slate-600">
              {images.length} image{images.length > 1 ? 's' : ''} • {formatFileSize(totalSize)}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Switch Format WebP */}
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
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
                {convertToWebP && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                    Recommandé
                  </span>
                )}
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
            </div>

            {/* Switch Lossy/Lossless (seulement si WebP) */}
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
              
              <Button
                onClick={onCompress}
                disabled={isProcessing || images.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Icon name="download" size={16} className="mr-2" />
                {isProcessing ? 'Compression...' : `Compresser ${images.length} image${images.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des images */}
      <div className="space-y-4">
        {images.map((image, index) => (
          <div
            key={index}
            className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow"
          >
            <div className="grid grid-cols-1 md:grid-cols-[80px_1fr_auto] gap-4 items-center">
              {/* Aperçu */}
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 mx-auto md:mx-0">
                <img
                  src={image.preview}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="text-center md:text-left">
                <h4 className="font-medium text-slate-800 mb-1 truncate">
                  {image.name}
                </h4>
                <div className="flex items-center justify-center md:justify-start gap-3 text-sm text-slate-600">
                  <span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium">
                    {image.format}
                  </span>
                  <span>{formatFileSize(image.originalSize)}</span>
                </div>
              </div>

              {/* Estimation compression intelligente */}
              <div className="text-center text-sm text-slate-500">
                {(() => {
                  const estimation = getEstimatedCompression(image);
                  return (
                    <>
                      <div className="font-medium text-green-600">
                        ~-{estimation.percent}%
                      </div>
                      <div>
                        ~{formatFileSize(image.originalSize * estimation.ratio)}
                      </div>
                      {convertToWebP && (
                        <div className="text-xs text-blue-600 mt-1">
                          → WebP
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingImageList;
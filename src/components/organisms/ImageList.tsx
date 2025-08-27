import React from "react";
import Button from "../atoms/Button";
import Icon from "../atoms/Icon";
import ImagePreview from "../molecules/ImagePreview";

interface CompressedImage {
  name: string;
  originalSize: number;
  compressedSize: number;
  savings: number;
  preview: string;
}

interface ImageListProps {
  images: CompressedImage[];
  onDownload: (image: CompressedImage) => void;
  onClear: () => void;
  onDownloadAll?: () => void;
  className?: string;
}

const ImageList: React.FC<ImageListProps> = ({
  images,
  onDownload,
  onClear,
  onDownloadAll,
  className = "",
}) => {
  if (images.length === 0) {
    return null;
  }

  const calculateTotalSavings = () => {
    const totalOriginal = images.reduce(
      (sum, img) => sum + img.originalSize,
      0
    );
    const totalCompressed = images.reduce(
      (sum, img) => sum + img.compressedSize,
      0
    );
    return Math.round(
      ((totalOriginal - totalCompressed) / totalOriginal) * 100
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getTotalSizes = () => {
    const totalOriginal = images.reduce(
      (sum, img) => sum + img.originalSize,
      0
    );
    const totalCompressed = images.reduce(
      (sum, img) => sum + img.compressedSize,
      0
    );
    return { totalOriginal, totalCompressed };
  };

  const { totalOriginal, totalCompressed } = getTotalSizes();

  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm ${className}`}>
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-slate-200 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">
            Images compressées ({images.length})
          </h3>
          <p className="text-sm text-slate-600">
            {formatFileSize(totalOriginal)} → {formatFileSize(totalCompressed)}
            <span className="ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
              -{calculateTotalSavings()}% au total
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          {onDownloadAll && (
            <Button onClick={onDownloadAll} size="sm">
              <Icon name="download" size={16} className="mr-2" />
              Tout télécharger
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={onClear}>
            <Icon name="trash" size={16} className="mr-2" />
            Tout effacer
          </Button>
        </div>
      </div>

      {/* Images List */}
      <div className="space-y-4">
        {images.map((image, index) => (
          <ImagePreview
            key={`${image.name}-${index}`}
            image={image}
            onDownload={onDownload}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageList;

import React from "react";
import Button from "../atoms/Button";
import Icon from "../atoms/Icon";

interface CompressedImage {
  name: string;
  originalSize: number;
  compressedSize: number;
  savings: number;
  preview: string;
}

interface ImagePreviewProps {
  image: CompressedImage;
  onDownload: (image: CompressedImage) => void;
  className?: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  image,
  onDownload,
  className = "",
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-[80px_1fr_auto] gap-4 items-center p-4 border border-slate-200 rounded-lg hover:shadow-md hover:-translate-y-0.5 transition-all ${className}`}
    >
      {/* Image Thumbnail */}
      <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 mx-auto md:mx-0">
        <img
          src={image.preview}
          alt={image.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Image Info */}
      <div className="text-center md:text-left">
        <h4 className="font-medium text-slate-800 mb-2 truncate">
          {image.name}
        </h4>
        <div className="flex items-center justify-center md:justify-start gap-3 text-sm text-slate-600">
          <span>
            {formatFileSize(image.originalSize)} →{" "}
            {formatFileSize(image.compressedSize)}
          </span>
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
            -{image.savings}%
          </span>
        </div>
      </div>

      {/* Download Button */}
      <Button onClick={() => onDownload(image)} className="md:justify-self-end">
        <Icon name="download" size={16} className="mr-2" />
        Télécharger
      </Button>
    </div>
  );
};

export default ImagePreview;

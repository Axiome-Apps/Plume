import React from "react";
import Button from "../atoms/Button";
import Icon from "../atoms/Icon";
import { ImageData } from "../../types/image";

interface ImageCardProps {
  image: ImageData;
  onDownload?: (image: any) => void; // Simplifié pour éviter les conflits de types
  onRemove?: (image: any) => void; // Simplifié pour éviter les conflits de types
  convertToWebP?: boolean;
  className?: string;
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  onDownload,
  onRemove,
  convertToWebP = false,
  className = "",
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getStatusColor = () => {
    switch (image.status) {
      case 'pending': return 'border-slate-200 bg-white';
      case 'processing': return 'border-blue-300 bg-blue-50';
      case 'completed': return 'border-green-300 bg-green-50';
    }
  };


  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-[80px_1fr_auto] gap-4 items-center p-4 border rounded-lg transition-all duration-300 ${getStatusColor()} ${
        image.status === 'pending' ? 'hover:shadow-md hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {/* Image Thumbnail avec statut */}
      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-100 mx-auto md:mx-0">
        <img
          src={image.preview}
          alt={image.name}
          className="w-full h-full object-cover"
        />
        
        {/* Overlay de statut */}
        <div className="absolute inset-0 flex items-center justify-center">
          {image.status === 'processing' && (
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <div className="text-white">
                <Icon 
                  name="upload"
                  size={20} 
                  className="animate-spin"
                />
              </div>
            </div>
          )}
          
          {image.status === 'completed' && (
            <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
              <Icon name="check" size={12} className="text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
          <h4 className="font-medium text-slate-800 truncate">
            {image.name}
          </h4>
          
          {/* Status Badge */}
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            image.status === 'pending' ? 'bg-slate-100 text-slate-600' :
            image.status === 'processing' ? 'bg-blue-100 text-blue-700' :
            'bg-green-100 text-green-700'
          }`}>
            {image.status === 'pending' ? 'En attente' :
             image.status === 'processing' ? 'Compression...' :
             'Terminé'}
          </div>
        </div>

        {/* Progress bar pour processing */}
        {image.status === 'processing' && (
          <div className="mb-2">
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${image.progress}%` }}
              />
            </div>
            <div className="text-xs text-slate-500 mt-1">{image.progress}%</div>
          </div>
        )}

        {/* File Info */}
        <div className="flex items-center justify-center md:justify-start gap-3 text-sm text-slate-600">
          <span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium">
            {image.format}
          </span>
          
          {image.status === 'pending' && (
            <span>{formatFileSize(image.originalSize)}</span>
          )}
          
          {image.status === 'processing' && (
            <span>{formatFileSize(image.originalSize)}</span>
          )}
          
          {image.status === 'completed' && (
            <span>
              {formatFileSize(image.originalSize)} →{" "}
              {formatFileSize(image.compressedSize)}
            </span>
          )}
        </div>
      </div>

      {/* Action Section */}
      <div className="text-center text-sm">
        {image.status === 'pending' && (
          <div className="text-slate-500">
            <div className="font-medium text-green-600">
              ~-{image.estimatedCompression.percent}%
            </div>
            <div>
              ~{formatFileSize(image.originalSize * image.estimatedCompression.ratio)}
            </div>
            {convertToWebP && (
              <div className="text-xs text-blue-600 mt-1">
                → WebP
              </div>
            )}
            {onRemove && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onRemove(image)}
                className="mt-2"
              >
                <Icon name="trash" size={12} className="mr-1" />
                Retirer
              </Button>
            )}
          </div>
        )}

        {image.status === 'processing' && (
          <div className="text-blue-600 font-medium">
            <div className="animate-pulse">
              Compression...
            </div>
          </div>
        )}

        {image.status === 'completed' && (
          <div>
            <div className="mb-3">
              <div className="font-medium text-green-600">
                -{image.savings}%
              </div>
            </div>
            {onDownload && (
              <Button 
                onClick={() => onDownload(image)} 
                size="sm"
                className="md:justify-self-end"
              >
                <Icon name="download" size={16} className="mr-2" />
                Télécharger
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageCard;
import React from 'react';
import ImageCard from '../molecules/ImageCard';
import { ImageListHeader, CompressionSuccess } from '../molecules';
import { useImageStore } from '@/store/imageStore';

interface ImageListProps {
  className?: string;
}

const ImageList: React.FC<ImageListProps> = ({ className = '' }) => {
  const images = useImageStore(state => state.images);
  const compressImage = useImageStore(state => state.compressImage);
  const downloadImage = useImageStore(state => state.downloadImage);
  const removeImage = useImageStore(state => state.removeImage);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats and global controls */}
      <ImageListHeader />

      {/* Images List */}
      <div className="space-y-4">
        {images.map(image => (
          <ImageCard
            key={image.id}
            image={image}
            onDownload={image.isCompleted() ? () => downloadImage(image.id) : undefined}
            onRemove={() => removeImage(image.id)}
            onCompress={() => compressImage(image.id)}
          />
        ))}
      </div>

      <CompressionSuccess />
    </div>
  );
};

export default ImageList;

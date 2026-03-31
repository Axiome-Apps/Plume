import React from 'react';
import ImageCard from '../molecules/ImageCard';
import { ImageListHeader, CompressionSuccess } from '../molecules';
import { useImageStore } from '@/store/imageStore';
import { revealInFolder } from '@/lib/tauri';

const ImageList: React.FC = () => {
  const images = useImageStore(state => state.images);
  const compressImage = useImageStore(state => state.compressImage);
  const removeImage = useImageStore(state => state.removeImage);

  return (
    <div className="space-y-6">
      <ImageListHeader />

      <div className="space-y-4">
        {images.map(image => (
          <ImageCard
            key={image.id}
            image={image}
            onRemove={() => removeImage(image.id)}
            onCompress={() => compressImage(image.id)}
            onRevealInFolder={
              image.outputPath ? () => revealInFolder(image.outputPath!) : undefined
            }
          />
        ))}
      </div>

      <CompressionSuccess />

      <div className="border border-dashed border-secondary/20 rounded-lg p-3 text-center text-sm text-text/30 hover:text-text/50 hover:border-secondary/40 transition-colors">
        Glissez des images ici pour en ajouter
      </div>
    </div>
  );
};

export default ImageList;

import React, { useCallback } from 'react';
import { useImageStore } from '@/store/imageStore';
import { useTranslation } from '@/hooks/useTranslation';
import { revealInFolder, selectImageFiles } from '@/lib/tauri';
import ImageRow from '../molecules/ImageRow';
import BatchKpiCard from '../molecules/BatchKpiCard';
import SettingsPanel from '../molecules/SettingsPanel';
import { CompressionSuccess } from '../molecules';
import { Stroke } from '../brand';

const ImageList: React.FC = () => {
  const { t } = useTranslation();
  const images = useImageStore(state => state.images);
  const compressImage = useImageStore(state => state.compressImage);
  const removeImage = useImageStore(state => state.removeImage);
  const handleExternalDrop = useImageStore(state => state.handleExternalDrop);

  const browse = useCallback(async () => {
    try {
      const paths = await selectImageFiles();
      if (paths.length > 0) handleExternalDrop(paths);
    } catch (error) {
      console.error('Erreur sélection fichiers:', error);
    }
  }, [handleExternalDrop]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5 items-start">
      {/* Colonne gauche : lot en cours */}
      <div className="flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <span className="ax-eyebrow">{t('batch.eyebrow')}</span>
          <Stroke width={20} color="var(--color-primary-light)" />
        </div>

        <BatchKpiCard />

        <div className="bg-surface border border-rule rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-rule">
            <span className="ax-eyebrow">{t('batch.imagesCount', { count: images.length })}</span>
          </div>

          <div className="flex flex-col">
            {images.map(image => (
              <ImageRow
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

          <button
            type="button"
            onClick={browse}
            className="m-4 px-4 py-3 w-[calc(100%-2rem)] border border-dashed border-rule-2 rounded-md ax-caption text-fg-3 hover:text-fg hover:border-primary-light transition-colors text-center cursor-pointer bg-transparent"
          >
            {t('batch.dropHintBefore')}
            <span className="text-primary-light font-semibold">{t('batch.dropHintAction')}</span>
          </button>
        </div>

        <CompressionSuccess />
      </div>

      {/* Colonne droite : réglages */}
      <div className="min-w-0 lg:sticky lg:top-6">
        <SettingsPanel />
      </div>
    </div>
  );
};

export default ImageList;

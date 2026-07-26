import React from 'react';
import { useImageStore } from '@/store/imageStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useImageInput } from '@/hooks/useImageInput';
import { revealInFolder } from '@/lib/tauri';
import ImageRow from '../molecules/ImageRow';
import BatchKpiCard from './BatchKpiCard';
import { BatchProgress } from './BatchProgress';
import SettingsPanel from './SettingsPanel';
import { CompressionSuccess } from './CompressionSuccess';
import Stroke from '@/components/brand/Stroke';

const ImageList: React.FC = () => {
  const { t } = useTranslation();
  const images = useImageStore(state => state.images);
  const compressImage = useImageStore(state => state.compressImage);
  const removeImage = useImageStore(state => state.removeImage);
  const { browseFiles, browseFolder } = useImageInput();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5 items-start">
      {/* Left column: current batch */}
      <div className="flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <span className="eyebrow text-fg-3">{t('batch.eyebrow')}</span>
          <Stroke width={20} color="var(--color-primary-light)" />
        </div>

        <BatchKpiCard />

        <BatchProgress />

        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-line">
            <span className="eyebrow text-fg-3">
              {t('batch.imagesCount', { count: images.length })}
            </span>
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

          <div className="m-4 px-4 py-3 w-[calc(100%-2rem)] border border-dashed border-line-2 rounded-md caption text-fg-3 transition-colors text-center">
            {t('batch.dropHintBefore')}
            <button
              type="button"
              onClick={browseFiles}
              className="text-primary-light font-semibold hover:underline cursor-pointer bg-transparent"
            >
              {t('batch.dropHintAction')}
            </button>
            {' · '}
            <button
              type="button"
              onClick={browseFolder}
              className="text-primary-light font-semibold hover:underline cursor-pointer bg-transparent"
            >
              {t('batch.dropHintFolder')}
            </button>
          </div>
        </div>

        <CompressionSuccess />
      </div>

      {/* Right column: settings */}
      <div className="min-w-0 lg:sticky lg:top-6">
        <SettingsPanel />
      </div>
    </div>
  );
};

export default ImageList;

import React, { useCallback } from 'react';
import Button from '../atoms/Button';
import { UploadIcon } from '../icons';
import { SUPPORTED_FORMATS_DISPLAY } from '../../domain/constants';
import { selectImageFiles } from '../../lib/tauri';
import { useImageStore } from '@/store/imageStore';
import { useTranslation } from '@/hooks/useTranslation';

const DropZone: React.FC = () => {
  const { t } = useTranslation();
  const handleExternalDrop = useImageStore(state => state.handleExternalDrop);

  const handleFilesSelected = useCallback(async () => {
    try {
      const filePaths = await selectImageFiles();
      if (filePaths.length > 0) {
        handleExternalDrop(filePaths);
      }
    } catch (error) {
      console.error('Erreur sélection fichiers:', error);
    }
  }, [handleExternalDrop]);

  return (
    <div
      className="border border-dashed border-rule-2 rounded-xl p-12 sm:p-16 text-center bg-surface
        transition-colors hover:border-primary-light"
    >
      <UploadIcon size={40} className="text-primary-light mx-auto mb-5" />

      <h3 className="ax-heading text-fg mb-1">{t('compression.selectFiles')}</h3>
      <p className="ax-caption text-fg-3 mb-6">
        {SUPPORTED_FORMATS_DISPLAY} {t('common.supported')}
      </p>

      <Button onClick={handleFilesSelected} size="lg">
        <UploadIcon size={18} />
        {t('common.browse')}
      </Button>
    </div>
  );
};

export default DropZone;

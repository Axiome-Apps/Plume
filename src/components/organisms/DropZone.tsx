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
      className="border-2 border-dashed rounded-xl p-16 text-center bg-white transition-all duration-300
        border-secondary/30 hover:border-primary hover:bg-primary/5 hover:-translate-y-1 hover:shadow-lg"
    >
      <UploadIcon size={48} className="text-primary mx-auto mb-4" />

      <h3 className="text-xl font-semibold text-text mb-2">{t('compression.selectFiles')}</h3>

      <p className="text-text/50 mb-8">
        {SUPPORTED_FORMATS_DISPLAY} {t('common.supported')}
      </p>

      <Button onClick={handleFilesSelected} size="lg">
        <UploadIcon size={20} className="mr-2" />
        <span className="hidden sm:inline"> {t('common.browse')}</span>
        <span className="sm:hidden">Parcourir</span>
      </Button>
    </div>
  );
};

export default DropZone;

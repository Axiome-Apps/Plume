import React, { useCallback } from 'react';
import Button from '../atoms/Button';
import { UploadIcon } from '../icons';
import { SUPPORTED_FORMATS_DISPLAY } from '../../domain/constants';
import { selectImageFiles } from '../../lib/tauri';
import { useImageStore } from '@/store/imageStore';
import { useTranslation } from '@/hooks/useTranslation';

interface DropZoneProps {
  className?: string;
}

const DropZone: React.FC<DropZoneProps> = () => {
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

  const getAcceptedFormats = () => {
    return SUPPORTED_FORMATS_DISPLAY;
  };

  return (
    <div
      className="border-2 border-dashed rounded-xl p-16 text-center bg-white transition-all duration-300
        border-slate-300 hover:border-blue-400 hover:bg-blue-50 hover:-translate-y-1 hover:shadow-lg"
    >
      <UploadIcon size={48} className="text-blue-500 mx-auto mb-4" />

      <h3 className="text-xl font-semibold text-slate-800 mb-2">{t('compression.selectFiles')}</h3>

      <p className="text-slate-500 mb-8">
        {getAcceptedFormats()} {t('common.supported')}
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

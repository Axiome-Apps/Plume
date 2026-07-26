import React from 'react';
import Button from '../atoms/Button';
import { UploadIcon } from '@/components/icons/UploadIcon';
import { FolderIcon } from '@/components/icons/FolderIcon';
import { SUPPORTED_FORMATS_DISPLAY } from '@/domain/constants';
import { useImageInput } from '@/hooks/useImageInput';
import { useTranslation } from '@/hooks/useTranslation';

const DropZone: React.FC = () => {
  const { t } = useTranslation();
  const { browseFiles, browseFolder } = useImageInput();

  return (
    <div
      className="border border-dashed border-line-2 rounded-xl p-12 sm:p-16 text-center bg-surface
        transition-colors hover:border-primary-light"
    >
      <UploadIcon size={40} className="text-primary-light mx-auto mb-5" aria-hidden />

      <h3 className="heading text-fg mb-1">{t('compression.selectFiles')}</h3>
      <p className="caption text-fg-3 mb-6">
        {SUPPORTED_FORMATS_DISPLAY} {t('common.supported')}
      </p>

      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Button onClick={browseFiles} size="lg">
          <UploadIcon size={18} aria-hidden />
          {t('common.browse')}
        </Button>
        <Button onClick={browseFolder} size="lg" variant="ghost">
          <FolderIcon size={18} aria-hidden />
          {t('common.browseFolder')}
        </Button>
      </div>
    </div>
  );
};

export default DropZone;

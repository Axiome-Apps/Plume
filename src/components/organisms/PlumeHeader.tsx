import { FC, useCallback } from 'react';
import { Button, LanguageSelector } from '../atoms';
import { LogoPlume, Stroke } from '../brand';
import { UploadIcon } from '../icons';
import { useTranslation } from '@/hooks/useTranslation';
import { useImageStore } from '@/store/imageStore';
import { selectImageFiles } from '@/lib/tauri';

const PlumeHeader: FC = () => {
  const { t } = useTranslation();
  const images = useImageStore(s => s.images);
  const handleExternalDrop = useImageStore(s => s.handleExternalDrop);

  const pending = images.filter(i => i.isPending()).length;

  const browse = useCallback(async () => {
    try {
      const paths = await selectImageFiles();
      if (paths.length > 0) handleExternalDrop(paths);
    } catch (error) {
      console.error('Erreur sélection fichiers:', error);
    }
  }, [handleExternalDrop]);

  const tagline =
    pending > 0
      ? `${t('app.tagline')} · ${t('batch.pendingTagline', { count: pending })}`
      : t('app.tagline');

  return (
    <header className="flex items-start justify-between gap-4 mb-8 flex-wrap">
      <div className="flex items-center gap-4 min-w-0">
        <LogoPlume size={36} />
        <div className="min-w-0">
          <h1 className="ax-title text-fg leading-none">{t('app.name')}</h1>
          <div className="mt-2 text-primary-light">
            <Stroke width={36} strokeWidth={1.8} />
          </div>
          <p className="mt-2 ax-caption text-fg-3">{tagline}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <LanguageSelector />
        <Button variant="ghost" onClick={browse}>
          <UploadIcon size={16} />
          {t('common.import')}
        </Button>
      </div>
    </header>
  );
};

export default PlumeHeader;

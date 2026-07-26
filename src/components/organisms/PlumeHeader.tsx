import { FC } from 'react';
import Button from '@/components/atoms/Button';
import { LanguageSelector } from '@/components/atoms/LanguageSelector';
import LogoPlume from '@/components/brand/LogoPlume';
import Stroke from '@/components/brand/Stroke';
import { UploadIcon } from '@/components/icons/UploadIcon';
import { FolderIcon } from '@/components/icons/FolderIcon';
import { useTranslation } from '@/hooks/useTranslation';
import { useImageInput } from '@/hooks/useImageInput';
import { useImageStore } from '@/store/imageStore';
import { Image } from '@/domain/image/entity';

const PlumeHeader: FC = () => {
  const { t } = useTranslation();
  const images = useImageStore(s => s.images);
  const { browseFiles, browseFolder } = useImageInput();

  const pending = images.filter(i => Image.isPending(i)).length;

  const tagline =
    pending > 0
      ? `${t('app.tagline')} · ${t('batch.pendingTagline', { count: pending })}`
      : t('app.tagline');

  return (
    <header className="flex items-start justify-between gap-4 mb-8 flex-wrap">
      <div className="flex items-center gap-4 min-w-0">
        <LogoPlume size={36} />
        <div className="min-w-0">
          <h1 className="title text-fg leading-none">{t('app.name')}</h1>
          <div className="mt-2 text-primary-light">
            <Stroke width={36} strokeWidth={1.8} />
          </div>
          <p className="mt-2 caption text-fg-3">{tagline}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <LanguageSelector />
        <Button variant="ghost" onClick={browseFiles}>
          <UploadIcon size={16} aria-hidden />
          {t('common.import')}
        </Button>
        <Button
          variant="icon"
          onClick={browseFolder}
          title={t('common.browseFolder')}
          aria-label={t('common.browseFolder')}
        >
          <FolderIcon size={16} aria-hidden />
        </Button>
      </div>
    </header>
  );
};

export default PlumeHeader;

import { Button } from '@/components/atoms';
import { FeatherIcon, DownloadIcon, TrashIcon } from '@/components/icons';
import type { ImageStatus } from '@/domain/image';
import { useTranslation } from '@/hooks/useTranslation';

interface ImageActionsProps {
  status: ImageStatus;
  onCompress?: () => void;
  onDownload?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function ImageActions({
  status,
  onCompress,
  onDownload,
  onRemove,
  className,
}: ImageActionsProps) {
  const { t } = useTranslation();

  return (
    <div className={`flex gap-1 ${className}`}>
      {status === 'pending' && (
        <>
          <Button
            onClick={onCompress}
            size="sm"
            color="blue"
            className="flex-[2] md:flex-none md:p-2"
            title="Compresser"
          >
            <FeatherIcon size={16} className="md:mx-0" />
            <span className="ml-2 md:hidden">Compresser</span>
          </Button>
          <Button
            onClick={onRemove}
            size="sm"
            color="red"
            className="flex-1 md:flex-none md:p-2"
            title="Supprimer"
          >
            <TrashIcon size={16} />
          </Button>
        </>
      )}

      {status === 'completed' && (
        <>
          <Button
            onClick={onDownload}
            size="sm"
            color="green"
            className="flex-[2] md:flex-none md:p-2"
            title="Télécharger"
          >
            <DownloadIcon size={16} />
            <span className="ml-2 md:hidden">{t('common.download')}</span>
          </Button>
          <Button
            onClick={onRemove}
            size="sm"
            color="red"
            className="flex-1 md:flex-none md:p-2"
            title="Supprimer"
          >
            <TrashIcon size={16} />
          </Button>
        </>
      )}

      {(status === 'processing' || status === 'error') && (
        <Button
          onClick={onRemove}
          size="sm"
          color="red"
          className="w-full md:w-auto md:p-2"
          title="Supprimer"
        >
          <TrashIcon size={16} />
          <span className="ml-2 md:hidden">Supprimer</span>
        </Button>
      )}
    </div>
  );
}

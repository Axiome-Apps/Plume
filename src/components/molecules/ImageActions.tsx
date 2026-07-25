import Button from '@/components/atoms/Button';
import { FolderIcon } from '@/components/icons/FolderIcon';
import { TrashIcon } from '@/components/icons/TrashIcon';
import LogoPlume from '@/components/brand/LogoPlume';
import { useTranslation } from '@/hooks/useTranslation';
import type { ImageStatus } from '@/domain/image/schema';

interface ImageActionsProps {
  status: ImageStatus;
  onCompress?: () => void;
  onRemove?: () => void;
  onRevealInFolder?: () => void;
}

export function ImageActions({
  status,
  onCompress,
  onRemove,
  onRevealInFolder,
}: ImageActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2">
      {status === 'pending' && (
        <>
          <Button
            variant="primary"
            size="sm"
            onClick={onCompress}
            title={t('actions.compress')}
            aria-label={t('actions.compress')}
          >
            <LogoPlume size={20} color="white" />
          </Button>
          <Button
            variant="icon"
            size="sm"
            onClick={onRemove}
            title={t('actions.delete')}
            aria-label={t('actions.delete')}
          >
            <TrashIcon size={16} aria-hidden />
          </Button>
        </>
      )}

      {status === 'completed' && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRevealInFolder}
            title={t('actions.openFolder')}
            aria-label={t('actions.openFolder')}
          >
            <FolderIcon size={16} aria-hidden />
          </Button>
          <Button
            variant="icon"
            size="sm"
            onClick={onRemove}
            title={t('actions.delete')}
            aria-label={t('actions.delete')}
          >
            <TrashIcon size={16} aria-hidden />
          </Button>
        </>
      )}

      {(status === 'processing' || status === 'error') && (
        <Button
          variant="icon"
          size="sm"
          onClick={onRemove}
          title={t('actions.delete')}
          aria-label={t('actions.delete')}
        >
          <TrashIcon size={16} aria-hidden />
        </Button>
      )}
    </div>
  );
}

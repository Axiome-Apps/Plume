import { Button } from '@/components/atoms';
import { FolderIcon, TrashIcon } from '@/components/icons';
import { LogoPlume } from '@/components/brand';
import { useTranslation } from '@/hooks/useTranslation';
import type { ImageStatus } from '@/domain/image';

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
          <Button variant="primary" size="sm" onClick={onCompress} title={t('actions.compress')}>
            <LogoPlume size={20} color="white" />
          </Button>
          <Button variant="icon" size="sm" onClick={onRemove} title={t('actions.delete')}>
            <TrashIcon size={16} />
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
          >
            <FolderIcon size={16} />
          </Button>
          <Button variant="icon" size="sm" onClick={onRemove} title={t('actions.delete')}>
            <TrashIcon size={16} />
          </Button>
        </>
      )}

      {(status === 'processing' || status === 'error') && (
        <Button variant="icon" size="sm" onClick={onRemove} title={t('actions.delete')}>
          <TrashIcon size={16} />
        </Button>
      )}
    </div>
  );
}

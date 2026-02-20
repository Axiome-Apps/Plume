import { Button } from '@/components/atoms';
import { FeatherIcon, DownloadIcon, TrashIcon } from '@/components/icons';
import type { ImageStatus } from '@/domain/image';

interface ImageActionsProps {
  status: ImageStatus;
  onCompress?: () => void;
  onDownload?: () => void;
  onRemove?: () => void;
}

const squareBtn = '!p-0 h-16 w-16 !rounded-full';

export function ImageActions({ status, onCompress, onDownload, onRemove }: ImageActionsProps) {
  return (
    <div className="flex gap-2 h-full">
      {status === 'pending' && (
        <>
          <Button onClick={onCompress} color="accent" className={squareBtn} title="Compresser">
            <FeatherIcon size={28} />
          </Button>
          <Button onClick={onRemove} color="error" className={squareBtn} title="Supprimer">
            <TrashIcon size={28} />
          </Button>
        </>
      )}

      {status === 'completed' && (
        <>
          <Button onClick={onDownload} color="success" className={squareBtn} title="Télécharger">
            <DownloadIcon size={28} />
          </Button>
          <Button onClick={onRemove} color="error" className={squareBtn} title="Supprimer">
            <TrashIcon size={28} />
          </Button>
        </>
      )}

      {(status === 'processing' || status === 'error') && (
        <Button onClick={onRemove} color="error" className={squareBtn} title="Supprimer">
          <TrashIcon size={28} />
        </Button>
      )}
    </div>
  );
}

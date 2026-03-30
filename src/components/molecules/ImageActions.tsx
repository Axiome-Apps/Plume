import { Button } from '@/components/atoms';
import { FeatherIcon, TrashIcon } from '@/components/icons';
import type { ImageStatus } from '@/domain/image';

interface ImageActionsProps {
  status: ImageStatus;
  onCompress?: () => void;
  onRemove?: () => void;
}

const squareBtn = '!p-0 h-16 w-16 !rounded-full';

export function ImageActions({ status, onCompress, onRemove }: ImageActionsProps) {
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

      {(status === 'completed' || status === 'processing' || status === 'error') && (
        <Button onClick={onRemove} color="error" className={squareBtn} title="Supprimer">
          <TrashIcon size={28} />
        </Button>
      )}
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { DragDropEventEntity } from '@/domain/drag-drop/entity';

/**
 * Hook handling application-wide drag & drop.
 * Encapsulates all the Tauri event listening logic.
 */
export function useDragDropGlobal(onFilesDropped: (paths: string[]) => void) {
  const callbackRef = useRef(onFilesDropped);
  callbackRef.current = onFilesDropped;

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    const setupListener = async () => {
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');

        if (cancelled) return;

        unlisten = await getCurrentWebviewWindow().onDragDropEvent(rawEvent => {
          try {
            const dragDropEvent = DragDropEventEntity.fromRawEvent(rawEvent);
            const validImagePaths = dragDropEvent.processDropEvent();

            if (validImagePaths && validImagePaths.length > 0) {
              const totalDropped = dragDropEvent.paths?.length ?? 0;
              const rejected = totalDropped - validImagePaths.length;
              if (rejected > 0) {
                toast.info(
                  `${rejected} fichier${rejected > 1 ? 's' : ''} non supporté${rejected > 1 ? 's' : ''} ignoré${rejected > 1 ? 's' : ''}`
                );
              }
              callbackRef.current(validImagePaths);
            }
          } catch (error) {
            console.error('useDragDropGlobal: Invalid drag & drop event:', error);
          }
        });
      } catch (error) {
        console.error('useDragDropGlobal: Listener setup error:', error);
      }
    };

    setupListener();

    return () => {
      cancelled = true;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);
}

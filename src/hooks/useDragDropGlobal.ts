import { useEffect, useRef } from 'react';
import { DragDropEventEntity } from '@/domain/drag-drop/entity';

/**
 * Hook pour gérer le drag & drop global de l'application
 * Encapsule toute la logique d'écoute des événements Tauri
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

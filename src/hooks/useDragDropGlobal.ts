import { useEffect } from 'react';
import { DragDropEventEntity } from '@/domain/drag-drop/entity';

/**
 * Hook pour gérer le drag & drop global de l'application
 * Encapsule toute la logique d'écoute des événements Tauri
 */
export function useDragDropGlobal(onFilesDropped: (paths: string[]) => void) {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let isSetup = false;

    const setupListener = async () => {
      try {
        // Nettoyer l'ancien listener s'il existe
        if (unlisten) {
          unlisten();
          unlisten = undefined;
        }

        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        unlisten = await getCurrentWebviewWindow().onDragDropEvent(rawEvent => {
          try {
            const dragDropEvent = DragDropEventEntity.fromRawEvent(rawEvent);
            const validImagePaths = dragDropEvent.processDropEvent();

            if (validImagePaths && validImagePaths.length > 0) {
              onFilesDropped(validImagePaths);
            }
          } catch (error) {
            console.error('❌ useDragDropGlobal: Événement drag & drop invalide:', error);
          }
        });
        isSetup = true;
        console.log('✅ useDragDropGlobal: Listener setup successfully');
      } catch (error) {
        console.error('❌ useDragDropGlobal: Erreur setup listener:', error);
      }
    };

    setupListener();

    return () => {
      if (unlisten && isSetup) {
        console.log('🧹 useDragDropGlobal: Cleaning up listener');
        unlisten();
        unlisten = undefined;
        isSetup = false;
      }
    };
  }, [onFilesDropped]);
}

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { DragDropEvent } from '@/domain/drag-drop/entity';
import { translate } from '@/domain/i18n/translate';
import { onDragDrop } from '@/lib/tauri';

/**
 * Hook handling application-wide drag & drop. The Tauri event boundary lives in
 * `@/lib/tauri` (ADR-0004); this hook only orchestrates the UI reaction.
 */
export function useDragDropGlobal(onFilesDropped: (paths: string[]) => void) {
  const callbackRef = useRef(onFilesDropped);
  callbackRef.current = onFilesDropped;

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    onDragDrop(event => {
      const validImagePaths = DragDropEvent.processDrop(event);
      if (validImagePaths && validImagePaths.length > 0) {
        const totalDropped = DragDropEvent.paths(event)?.length ?? 0;
        const rejected = totalDropped - validImagePaths.length;
        if (rejected > 0) {
          toast.info(translate('toasts.unsupportedIgnored', { count: rejected }));
        }
        callbackRef.current(validImagePaths);
      }
    })
      .then(fn => {
        if (cancelled) fn();
        else unlisten = fn;
      })
      .catch(error => {
        console.error('useDragDropGlobal: listener setup error:', error);
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}

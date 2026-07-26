import { useEffect, useRef } from 'react';
import { DragDropEvent } from '@/domain/drag-drop/entity';
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
      // Pass raw dropped paths (files and/or folders) straight through; the
      // backend scanner filters and expands them, and reports nothing usable.
      const paths = DragDropEvent.dropPaths(event);
      if (paths && paths.length > 0) {
        callbackRef.current(paths);
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

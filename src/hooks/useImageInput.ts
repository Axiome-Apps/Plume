import { useCallback } from 'react';
import { selectFolder, selectImageFiles } from '@/lib/tauri';
import { useImageStore } from '@/store/imageStore';

/**
 * The two button-driven input modes, shared by every add-image surface. Both
 * funnel through `handleExternalDrop`, which scans and adds. Drag & drop is
 * handled separately by `useDragDropGlobal`.
 */
export function useImageInput() {
  const handleExternalDrop = useImageStore(state => state.handleExternalDrop);

  const browseFiles = useCallback(async () => {
    try {
      const paths = await selectImageFiles();
      if (paths.length > 0) handleExternalDrop(paths);
    } catch (error) {
      console.error('File selection failed:', error);
    }
  }, [handleExternalDrop]);

  const browseFolder = useCallback(async () => {
    try {
      const folder = await selectFolder();
      if (folder) handleExternalDrop([folder]);
    } catch (error) {
      console.error('Folder selection failed:', error);
    }
  }, [handleExternalDrop]);

  return { browseFiles, browseFolder };
}

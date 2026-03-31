import { useEffect } from 'react';
import AppLayout from './components/templates/AppLayout';
import DropZone from './components/organisms/DropZone';
import ImageList from './components/organisms/ImageList';
import { useImageStore } from './store/imageStore';
import { useDragDropGlobal } from '@/hooks/useDragDropGlobal';
import { initDatabase } from '@/lib/tauri';

function App() {
  const currentView = useImageStore(state => state.currentView());
  const handleExternalDrop = useImageStore(state => state.handleExternalDrop);
  const initializeProgressListener = useImageStore(state => state.initializeProgressListener);

  useDragDropGlobal(handleExternalDrop);

  useEffect(() => {
    initializeProgressListener();
    initDatabase().catch(() => {});
  }, [initializeProgressListener]);

  return <AppLayout>{currentView === 'drop' ? <DropZone /> : <ImageList />}</AppLayout>;
}

export default App;

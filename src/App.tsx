import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import AppLayout from './components/templates/AppLayout';
import DropZone from './components/organisms/DropZone';
import ImageList from './components/organisms/ImageList';
import { useImageStore } from './store/imageStore';
import { useDragDropGlobal } from '@/hooks/useDragDropGlobal';

function App() {
  const currentView = useImageStore(state => state.currentView());
  const handleExternalDrop = useImageStore(state => state.handleExternalDrop);
  const initializeProgressListener = useImageStore(state => state.initializeProgressListener);

  useDragDropGlobal(handleExternalDrop);

  useEffect(() => {
    initializeProgressListener();
    // Initialize DB tables and seed baseline stats on first run
    invoke('init_database').catch(console.warn);
  }, [initializeProgressListener]);

  return <AppLayout>{currentView === 'drop' ? <DropZone /> : <ImageList />}</AppLayout>;
}

export default App;

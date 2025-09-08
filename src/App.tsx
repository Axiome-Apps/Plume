import { useEffect } from 'react';
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

  // Initialiser l'écoute des événements de progression au démarrage
  useEffect(() => {
    initializeProgressListener();
  }, [initializeProgressListener]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        {currentView === 'drop' ? <DropZone /> : <ImageList />}
      </div>
    </AppLayout>
  );
}

export default App;

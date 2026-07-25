import { useEffect } from 'react';
import AppLayout from './components/templates/AppLayout';
import DropZone from './components/organisms/DropZone';
import ImageList from './components/organisms/ImageList';
import ErrorBoundary from './components/organisms/ErrorBoundary';
import { useImageStore } from './store/imageStore';
import { useDragDropGlobal } from '@/hooks/useDragDropGlobal';
import { initDatabase } from '@/lib/tauri';

function App() {
  const currentView = useImageStore(state => state.currentView());
  const handleExternalDrop = useImageStore(state => state.handleExternalDrop);

  useDragDropGlobal(handleExternalDrop);

  useEffect(() => {
    // Best-effort: the app still runs on stored/fallback estimations if the
    // stats DB cannot be initialized, but the failure must be observable.
    initDatabase().catch(error => {
      console.error('Database initialization failed:', error);
    });
  }, []);

  return (
    <ErrorBoundary>
      <AppLayout>{currentView === 'drop' ? <DropZone /> : <ImageList />}</AppLayout>
    </ErrorBoundary>
  );
}

export default App;

import { useEffect, useState } from 'react';
import AppLayout from './components/templates/AppLayout';
import DropZone from './components/organisms/DropZone';
import ImageList from './components/organisms/ImageList';
import { useImageStore } from './store/imageStore';
import { useDragDropGlobal } from '@/hooks/useDragDropGlobal';
import {
  testDatabaseConnection,
  getStatsCount,
  getStatsSummary,
  getDatabaseStats,
  initDatabase,
  seedCompressionDatabase,
  getCompressionPrediction,
  testCompressionPrediction,
  type StatsSummary,
} from '@/lib/tauri';

function App() {
  const currentView = useImageStore(state => state.currentView());
  const handleExternalDrop = useImageStore(state => state.handleExternalDrop);
  const initializeProgressListener = useImageStore(state => state.initializeProgressListener);

  // Database stats state
  const [dbStats, setDbStats] = useState<{
    connectionTest: string | null;
    statsCount: number | null;
    statsSummary: StatsSummary | null;
    databaseStats: number | null;
    initResult: string | null;
    seedResult: string | null;
    predictionPngWebp: number | null;
    predictionJpegWebp: number | null;
    testPredictionResult: string | null;
    error: string | null;
  }>({
    connectionTest: null,
    statsCount: null,
    statsSummary: null,
    databaseStats: null,
    initResult: null,
    seedResult: null,
    predictionPngWebp: null,
    predictionJpegWebp: null,
    testPredictionResult: null,
    error: null,
  });

  useDragDropGlobal(handleExternalDrop);

  // Initialiser l'écoute des événements de progression au démarrage
  useEffect(() => {
    initializeProgressListener();
  }, [initializeProgressListener]);

  // Test database functions
  const testDatabase = async () => {
    try {
      console.log('Testing database functions...');

      const connectionTest = await testDatabaseConnection();
      console.log('Connection test result:', connectionTest);

      const statsCount = await getStatsCount();
      console.log('Stats count:', statsCount);

      const statsSummary = await getStatsSummary();
      console.log('Stats summary:', statsSummary);

      const databaseStats = await getDatabaseStats();
      console.log('Database stats:', databaseStats);

      setDbStats({
        connectionTest,
        statsCount,
        statsSummary,
        databaseStats,
        initResult: null,
        seedResult: null,
        predictionPngWebp: null,
        predictionJpegWebp: null,
        testPredictionResult: null,
        error: null,
      });
    } catch (error) {
      console.error('Database test error:', error);
      setDbStats(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  };

  // Initialize and seed database
  const initAndSeedDatabase = async () => {
    try {
      console.log('Initializing and seeding database...');

      const initResult = await initDatabase();
      console.log('Init result:', initResult);

      const seedResult = await seedCompressionDatabase();
      console.log('Seed result:', seedResult);

      // Get predictions after seeding
      const predictionPngWebp = await getCompressionPrediction('PNG', 'WebP');
      const predictionJpegWebp = await getCompressionPrediction('JPEG', 'WebP');

      // Test prediction with detailed info
      const testPredictionResult = await testCompressionPrediction('PNG', 'WebP', 1048576);

      setDbStats(prev => ({
        ...prev,
        initResult,
        seedResult,
        predictionPngWebp,
        predictionJpegWebp,
        testPredictionResult,
        error: null,
      }));
    } catch (error) {
      console.error('Database init/seed error:', error);
      setDbStats(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Database Stats Test Panel - Temporary */}
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <div className="flex items-center gap-4 mb-4">
            <h3 className="text-lg font-semibold">Database Stats Analysis</h3>
            <button
              onClick={testDatabase}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              Test Basic Stats
            </button>
            <button
              onClick={initAndSeedDatabase}
              className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              Init & Seed DB
            </button>
          </div>

          {dbStats.error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
              <strong>Error:</strong> {dbStats.error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Basic Stats</h4>
              <div>
                <strong>Connection:</strong>{' '}
                {dbStats.connectionTest?.includes('successful')
                  ? '✅'
                  : dbStats.connectionTest || 'Not tested'}
              </div>
              <div>
                <strong>Stats Count:</strong>{' '}
                {dbStats.statsCount !== null ? dbStats.statsCount : 'Not loaded'}
              </div>
              <div>
                <strong>DB Records:</strong>{' '}
                {dbStats.databaseStats !== null ? dbStats.databaseStats : 'Not loaded'}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Predictions</h4>
              <div>
                <strong>PNG→WebP:</strong>{' '}
                {dbStats.predictionPngWebp !== null
                  ? `${dbStats.predictionPngWebp.toFixed(1)}%`
                  : 'Not loaded'}
              </div>
              <div>
                <strong>JPEG→WebP:</strong>{' '}
                {dbStats.predictionJpegWebp !== null
                  ? `${dbStats.predictionJpegWebp.toFixed(1)}%`
                  : 'Not loaded'}
              </div>
              <div>
                <strong>Init Result:</strong> {dbStats.initResult ? '✅ Done' : 'Not run'}
              </div>
              <div>
                <strong>Seed Result:</strong> {dbStats.seedResult ? '✅ Done' : 'Not run'}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Stats Summary</h4>
              {dbStats.statsSummary ? (
                <>
                  <div>Total: {dbStats.statsSummary.total_compressions}</div>
                  <div>WebP Est: {dbStats.statsSummary.webp_estimation_percent.toFixed(1)}%</div>
                  <div>Confidence: {(dbStats.statsSummary.webp_confidence * 100).toFixed(1)}%</div>
                  <div>Samples: {dbStats.statsSummary.sample_count}</div>
                </>
              ) : (
                <div>Not loaded</div>
              )}
            </div>
          </div>

          {dbStats.testPredictionResult && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <h5 className="font-medium text-blue-800 mb-2">
                Prediction Test Details (PNG→WebP, 1MB):
              </h5>
              <pre className="text-xs text-blue-700 whitespace-pre-wrap">
                {dbStats.testPredictionResult}
              </pre>
            </div>
          )}
        </div>

        {currentView === 'drop' ? <DropZone /> : <ImageList />}
      </div>
    </AppLayout>
  );
}

export default App;

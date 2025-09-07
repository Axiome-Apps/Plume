import { FC, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Button from '../atoms/Button';

interface StatsSummary {
  total_compressions: number;
  webp_estimation_percent: number;
  webp_confidence: number;
  sample_count: number;
}

export const StatsDebug: FC = () => {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const result = await invoke<StatsSummary>('get_stats_summary');
      setSummary(result);
      console.log('📊 Stats Summary:', result);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetStats = async () => {
    try {
      await invoke('reset_compression_stats');
      setSummary(null);
      console.log('🗑️ Stats reset');
    } catch (error) {
      console.error('Failed to reset stats:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-slate-900 text-white p-4 rounded-lg shadow-lg max-w-sm">
      <h3 className="font-bold mb-2">📊 Debug Stats</h3>

      <div className="flex gap-2 mb-3">
        <Button size="sm" onClick={loadStats} disabled={loading}>
          {loading ? 'Loading...' : 'Load Stats'}
        </Button>
        <Button size="sm" variant="outlined" onClick={resetStats}>
          Reset
        </Button>
      </div>

      {summary && (
        <div className="text-sm space-y-1">
          <div>
            📈 Total compressions: <strong>{summary.total_compressions}</strong>
          </div>
          <div>
            🖼️ WebP estimation: <strong>{summary.webp_estimation_percent.toFixed(1)}%</strong>
          </div>
          <div>
            🎯 Confidence: <strong>{(summary.webp_confidence * 100).toFixed(1)}%</strong>
          </div>
          <div>
            📊 Sample count: <strong>{summary.sample_count}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useImageManagement } from '../useImageManagement';

// Mock des services Tauri
vi.mock('../../../infrastructure/tauri/tauriCommands', () => ({
  tauriCommands: {
    compressImage: vi.fn(),
    saveToDownloads: vi.fn(),
    saveAllToDownloads: vi.fn(),
  },
}));

// Mock console pour éviter les logs pendant les tests
const originalConsole = globalThis.console;
beforeAll(() => {
  globalThis.console = {
    ...originalConsole,
    log: vi.fn(),
    error: vi.fn(),
  };
});

afterAll(() => {
  globalThis.console = originalConsole;
});

describe('useImageManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useImageManagement());

    expect(result.current.images).toEqual([]);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.compressionSettings).toBeDefined();
    expect(result.current.stats.totalCount).toBe(0);
  });

  it('calculates stats correctly with empty state', () => {
    const { result } = renderHook(() => useImageManagement());

    expect(result.current.pendingImages).toEqual([]);
    expect(result.current.completedImages).toEqual([]);
    expect(result.current.hasPendingImages).toBe(false);
    expect(result.current.hasCompletedImages).toBe(false);
    expect(result.current.stats.totalCount).toBe(0);
    expect(result.current.stats.pendingCount).toBe(0);
    expect(result.current.stats.completedCount).toBe(0);
  });

  it('provides compression settings controls', () => {
    const { result } = renderHook(() => useImageManagement());

    const initialWebPSetting = result.current.compressionSettings.convertToWebP;
    const initialLossySetting = result.current.compressionSettings.lossyMode;

    act(() => {
      result.current.toggleWebPConversion(!initialWebPSetting);
    });

    expect(result.current.compressionSettings.convertToWebP).toBe(!initialWebPSetting);

    act(() => {
      result.current.toggleLossyMode(!initialLossySetting);
    });

    expect(result.current.compressionSettings.lossyMode).toBe(!initialLossySetting);
  });

  it('provides action methods', () => {
    const { result } = renderHook(() => useImageManagement());

    // Vérifier que toutes les méthodes d'action sont disponibles
    expect(typeof result.current.startCompression).toBe('function');
    expect(typeof result.current.downloadImage).toBe('function');
    expect(typeof result.current.downloadAllImages).toBe('function');
    expect(typeof result.current.removeImage).toBe('function');
    expect(typeof result.current.clearAllImages).toBe('function');
  });

  it('clearAllImages resets state', () => {
    const { result } = renderHook(() => useImageManagement());

    act(() => {
      result.current.clearAllImages();
    });

    expect(result.current.images).toEqual([]);
    expect(result.current.isProcessing).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useImageStore } from '../imageStore';
import { AdaptiveProgressManager } from '@/domain/progress/adaptiveProgress';
import type { ImageType } from '@/domain/image/schema';
import {
  getFileInformation,
  compressImage as tauriCompressImage,
  getProgressEstimation,
  scanPathsForImages,
} from '@/lib/tauri';
import * as SizePrediction from '@/domain/size-prediction/service';
import { toast } from 'sonner';

vi.mock('@/lib/tauri', () => ({
  getFileInformation: vi.fn(),
  compressImage: vi.fn(),
  getProgressEstimation: vi.fn(),
  scanPathsForImages: vi.fn(),
}));

vi.mock('@/domain/size-prediction/service', () => ({
  getEstimation: vi.fn(),
}));

// Echo the interpolation options back so a test can assert what the store
// passed — the plural count in particular drives the _one / _other suffixes.
vi.mock('@/domain/i18n/translate', () => ({
  translate: (key: string, options?: Record<string, unknown>) =>
    options ? `${key}:${JSON.stringify(options)}` : key,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const getFileInformationMock = vi.mocked(getFileInformation);
const getEstimationMock = vi.mocked(SizePrediction.getEstimation);
const tauriCompressImageMock = vi.mocked(tauriCompressImage);
const getProgressEstimationMock = vi.mocked(getProgressEstimation);
const scanPathsForImagesMock = vi.mocked(scanPathsForImages);

const FALLBACK_ESTIMATION = { percent: 65, ratio: 0.35, confidence: 0.5, sample_count: 0 };

// noUncheckedIndexedAccess: fetch an image by position, failing loudly if the
// store holds none there, so assertions read without optional chaining.
function requireImage(index = 0): ImageType {
  const image = useImageStore.getState().images[index];
  if (!image) throw new Error(`expected an image at index ${index}`);
  return image;
}

/** A promise whose resolution we drive by hand, to interleave IPC calls. */
function makeDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

function makeImage(overrides: Partial<ImageType> = {}): ImageType {
  return {
    id: 'img-1',
    name: 'photo.png',
    originalSize: 1000,
    format: 'PNG',
    preview: 'blob:preview',
    path: '/tmp/photo.png',
    status: 'pending',
    ...overrides,
  };
}

/** The store is a module singleton, so every test starts from a known state. */
function resetStore() {
  useImageStore.setState({
    images: [],
    compressionState: 'idle',
    isProcessing: false,
    compressionSettings: { outputFormat: 'webp', compressionLevel: 'balanced' },
    progressManagers: {},
  });
}

// Several tests exercise best-effort fallbacks on purpose (a rejected IPC call),
// and the store logs each via `console.error` inside its catch — the sanctioned
// frontend channel. Silence it so the expected diagnostics do not leak onto the
// CI stderr as alarming noise; tests that trigger a fallback assert on this spy
// so the silence stays intentional rather than hiding a real regression.
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetStore();
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  getFileInformationMock.mockReset();
  getEstimationMock.mockReset();
  getEstimationMock.mockResolvedValue({
    percent: 50,
    ratio: 0.5,
    confidence: 0.9,
    sample_count: 10,
    is_learning: false,
  });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('currentView', () => {
  it('shows the drop zone while the batch is empty', () => {
    expect(useImageStore.getState().currentView()).toBe('drop');
  });

  it('shows the list as soon as there is an image', () => {
    useImageStore.setState({ images: [makeImage()] });

    expect(useImageStore.getState().currentView()).toBe('list');
  });

  it('stays on the list while the run is finished but an image is not', () => {
    useImageStore.setState({
      compressionState: 'completed',
      images: [
        makeImage({ id: 'a', status: 'completed', compressedSize: 400 }),
        makeImage({ id: 'b', status: 'error' }),
      ],
    });

    expect(useImageStore.getState().currentView()).toBe('list');
  });

  it('shows the success screen only once every image is completed', () => {
    useImageStore.setState({
      compressionState: 'completed',
      images: [
        makeImage({ id: 'a', status: 'completed', compressedSize: 400 }),
        makeImage({ id: 'b', status: 'completed', compressedSize: 500 }),
      ],
    });

    expect(useImageStore.getState().currentView()).toBe('success');
  });
});

describe('addImages', () => {
  const backendInfo = {
    path: '/tmp/holiday.HEIC',
    name: 'holiday.HEIC',
    size: 4096,
    extension: 'heic',
    is_image: true,
  };

  it('builds the image from the backend metadata rather than the path string', async () => {
    getFileInformationMock.mockResolvedValue(backendInfo);

    await useImageStore.getState().addImages(['/tmp/holiday.HEIC']);

    const image = requireImage();
    expect(image.name).toBe('holiday.HEIC');
    expect(image.originalSize).toBe(4096);
    expect(image.format).toBe('HEIC');
    expect(image.status).toBe('pending');
  });

  it('falls back to the path when the backend cannot describe the file', async () => {
    getFileInformationMock.mockRejectedValue(new Error('no such file'));

    await useImageStore.getState().addImages(['/tmp/photo.png']);

    const image = requireImage();
    expect(image.name).toBe('photo.png');
    expect(image.format).toBe('PNG');
    expect(image.originalSize).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'addImages: file info unavailable, using path fallback:',
      expect.any(Error)
    );
  });

  it('ignores a path that is already in the batch', async () => {
    getFileInformationMock.mockResolvedValue(backendInfo);
    useImageStore.setState({ images: [makeImage({ path: '/tmp/photo.png' })] });

    await useImageStore.getState().addImages(['/tmp/photo.png']);

    expect(useImageStore.getState().images).toHaveLength(1);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('adds only the paths that are new', async () => {
    getFileInformationMock.mockResolvedValue(backendInfo);
    useImageStore.setState({ images: [makeImage({ path: '/tmp/photo.png' })] });

    await useImageStore.getState().addImages(['/tmp/photo.png', '/tmp/other.png']);

    expect(useImageStore.getState().images).toHaveLength(2);
    expect(toast.success).toHaveBeenCalledWith('toasts.imagesAdded:{"count":1}');
  });

  it('reports how many images were added, so the toast can pluralise', async () => {
    getFileInformationMock.mockResolvedValue(backendInfo);

    await useImageStore.getState().addImages(['/tmp/a.png', '/tmp/b.png']);

    expect(toast.success).toHaveBeenCalledWith('toasts.imagesAdded:{"count":2}');
  });

  // The service returns an enriched estimation (is_learning, description); only
  // the four fields the image schema knows about are kept.
  it('attaches the estimation returned by the service, narrowed to the schema', async () => {
    getFileInformationMock.mockResolvedValue(backendInfo);

    await useImageStore.getState().addImages(['/tmp/holiday.HEIC']);

    expect(requireImage().estimatedCompression).toEqual({
      percent: 50,
      ratio: 0.5,
      confidence: 0.9,
      sample_count: 10,
    });
  });

  it('still adds the image with a default estimation when the service fails', async () => {
    getFileInformationMock.mockResolvedValue(backendInfo);
    getEstimationMock.mockRejectedValue(new Error('database unavailable'));

    await useImageStore.getState().addImages(['/tmp/holiday.HEIC']);

    expect(useImageStore.getState().images).toHaveLength(1);
    expect(requireImage().estimatedCompression).toEqual(FALLBACK_ESTIMATION);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'addImages: estimation failed, using fallback:',
      expect.any(Error)
    );
  });

  it('gives every image its own id', async () => {
    getFileInformationMock.mockResolvedValue(backendInfo);

    await useImageStore.getState().addImages(['/tmp/a.png', '/tmp/b.png', '/tmp/c.png']);

    const ids = useImageStore.getState().images.map(image => image.id);
    expect(new Set(ids).size).toBe(3);
  });
});

describe('removeImage and clearImages', () => {
  it('removes only the targeted image', () => {
    useImageStore.setState({
      images: [makeImage({ id: 'a' }), makeImage({ id: 'b' })],
    });

    useImageStore.getState().removeImage('a');

    expect(useImageStore.getState().images.map(image => image.id)).toEqual(['b']);
  });

  it('leaves the batch alone when the id is unknown', () => {
    useImageStore.setState({ images: [makeImage({ id: 'a' })] });

    useImageStore.getState().removeImage('nope');

    expect(useImageStore.getState().images).toHaveLength(1);
  });

  // A manager left running would keep calling updateImageProgress on an image
  // that no longer exists.
  it('stops every progress manager before emptying the batch', () => {
    const manager = new AdaptiveProgressManager('a', 1000);
    const stop = vi.spyOn(manager, 'stop');
    useImageStore.setState({
      images: [makeImage({ id: 'a' })],
      compressionState: 'completed',
      progressManagers: { a: manager },
    });

    useImageStore.getState().clearImages();

    expect(stop).toHaveBeenCalledOnce();
    expect(useImageStore.getState().images).toEqual([]);
    expect(useImageStore.getState().progressManagers).toEqual({});
    expect(useImageStore.getState().compressionState).toBe('idle');
  });
});

describe('compression settings', () => {
  it('locks the level to aggressive for PNG, where the level has no effect', () => {
    useImageStore.getState().setOutputFormat('png');

    expect(useImageStore.getState().compressionSettings).toEqual({
      outputFormat: 'png',
      compressionLevel: 'aggressive',
    });
  });

  it('keeps the chosen level for the other formats', () => {
    useImageStore.getState().setCompressionLevel('light');
    useImageStore.getState().setOutputFormat('webp');

    expect(useImageStore.getState().compressionSettings).toEqual({
      outputFormat: 'webp',
      compressionLevel: 'light',
    });
  });

  it('merges a partial settings update', () => {
    useImageStore.getState().setCompressionSettings({ compressionLevel: 'aggressive' });

    expect(useImageStore.getState().compressionSettings).toEqual({
      outputFormat: 'webp',
      compressionLevel: 'aggressive',
    });
  });
});

describe('recalculateEstimations', () => {
  it('refreshes pending images and leaves the others untouched', async () => {
    const completed = makeImage({ id: 'done', status: 'completed', compressedSize: 400 });
    useImageStore.setState({ images: [makeImage({ id: 'wait' }), completed] });
    getEstimationMock.mockResolvedValue({
      percent: 30,
      ratio: 0.7,
      confidence: 0.6,
      sample_count: 3,
      is_learning: true,
    });

    await useImageStore.getState().recalculateEstimations();

    const waiting = requireImage(0);
    const done = requireImage(1);
    expect(waiting.estimatedCompression).toMatchObject({ percent: 30 });
    expect(done.estimatedCompression).toBeUndefined();
    expect(getEstimationMock).toHaveBeenCalledOnce();
  });

  it('does nothing when no image is waiting', async () => {
    useImageStore.setState({
      images: [makeImage({ id: 'done', status: 'completed', compressedSize: 400 })],
    });

    await useImageStore.getState().recalculateEstimations();

    expect(getEstimationMock).not.toHaveBeenCalled();
  });

  it('keeps the previous estimation when the service fails', async () => {
    useImageStore.setState({
      images: [makeImage({ id: 'wait', estimatedCompression: FALLBACK_ESTIMATION })],
    });
    getEstimationMock.mockRejectedValue(new Error('database unavailable'));

    await useImageStore.getState().recalculateEstimations();

    expect(requireImage().estimatedCompression).toEqual(FALLBACK_ESTIMATION);
  });
});

describe('startCompression guards', () => {
  it('does nothing while a run is already in progress', async () => {
    useImageStore.setState({ isProcessing: true, images: [makeImage()] });

    await useImageStore.getState().startCompression();

    expect(requireImage().status).toBe('pending');
    expect(useImageStore.getState().compressionState).toBe('idle');
  });

  it('does nothing when no image is waiting', async () => {
    useImageStore.setState({
      images: [makeImage({ status: 'completed', compressedSize: 400 })],
    });

    await useImageStore.getState().startCompression();

    expect(useImageStore.getState().compressionState).toBe('idle');
    expect(useImageStore.getState().isProcessing).toBe(false);
  });
});

describe('startCompression batch', () => {
  const summary = {
    original_size: 1000,
    compressed_size: 400,
    savings_percent: 60,
    output_path: '/tmp/out.webp',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    getProgressEstimationMock.mockReset();
    getProgressEstimationMock.mockResolvedValue({
      estimated_duration_ms: 500,
      confidence: 0.9,
      sample_count: 10,
    });
    tauriCompressImageMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires every pending image concurrently, not one after another', async () => {
    // Each compression hangs until we resolve it by hand. Sequential code would
    // await the first before calling the second; concurrent code calls all three
    // before any resolves.
    const deferreds = [
      makeDeferred<typeof summary>(),
      makeDeferred<typeof summary>(),
      makeDeferred<typeof summary>(),
    ];
    let call = 0;
    tauriCompressImageMock.mockImplementation(() => deferreds[call++]!.promise);

    useImageStore.setState({
      images: [
        makeImage({ id: 'a', path: '/tmp/a.png' }),
        makeImage({ id: 'b', path: '/tmp/b.png' }),
        makeImage({ id: 'c', path: '/tmp/c.png' }),
      ],
    });

    const run = useImageStore.getState().startCompression();
    // Flush the estimation awaits so every image reaches its IPC call.
    await vi.advanceTimersByTimeAsync(10);

    expect(tauriCompressImageMock).toHaveBeenCalledTimes(3);

    deferreds.forEach(d => d.resolve(summary));
    await vi.advanceTimersByTimeAsync(1000);
    await run;

    expect(requireImage(0).status).toBe('completed');
    expect(requireImage(1).status).toBe('completed');
    expect(requireImage(2).status).toBe('completed');
    expect(useImageStore.getState().compressionState).toBe('completed');
    expect(useImageStore.getState().isProcessing).toBe(false);
  });

  it('completes the batch even when one image fails, leaving the others done', async () => {
    tauriCompressImageMock
      .mockResolvedValueOnce(summary)
      .mockRejectedValueOnce(new Error('codec failure'))
      .mockResolvedValueOnce(summary);

    useImageStore.setState({
      images: [
        makeImage({ id: 'a', path: '/tmp/a.png' }),
        makeImage({ id: 'b', path: '/tmp/b.png' }),
        makeImage({ id: 'c', path: '/tmp/c.png' }),
      ],
    });

    const run = useImageStore.getState().startCompression();
    await vi.advanceTimersByTimeAsync(1000);
    await run;

    const statuses = useImageStore.getState().images.map(img => img.status);
    expect(statuses).toContain('error');
    expect(statuses.filter(s => s === 'completed')).toHaveLength(2);
    expect(useImageStore.getState().isProcessing).toBe(false);
  });
});

describe('compressImage', () => {
  // The adaptive progress manager drives the 85→100 animation with setInterval,
  // so the run only settles once its timers fire — hence fake timers plus a
  // resolved IPC mock we can flush past.
  beforeEach(() => {
    vi.useFakeTimers();
    getProgressEstimationMock.mockReset();
    getProgressEstimationMock.mockResolvedValue({
      estimated_duration_ms: 500,
      confidence: 0.9,
      sample_count: 10,
    });
    tauriCompressImageMock.mockReset();
    tauriCompressImageMock.mockResolvedValue({
      original_size: 1000,
      compressed_size: 400,
      savings_percent: 60,
      output_path: '/tmp/out.webp',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('compresses only the targeted image, leaving the other pending images untouched', async () => {
    useImageStore.setState({
      images: [
        makeImage({ id: 'img-1', path: '/tmp/photo1.png' }),
        makeImage({ id: 'img-2', name: 'photo2.png', path: '/tmp/photo2.png' }),
      ],
    });

    const run = useImageStore.getState().compressImage('img-2');
    // Flush the awaited IPC microtasks and let the completion animation fire.
    await vi.advanceTimersByTimeAsync(1000);
    await run;

    // The IPC ran exactly once, for the targeted image only.
    expect(tauriCompressImageMock).toHaveBeenCalledTimes(1);
    expect(tauriCompressImageMock).toHaveBeenCalledWith(
      expect.objectContaining({ file_path: '/tmp/photo2.png' })
    );

    // The other pending image was never touched; the targeted one completed.
    expect(requireImage(0).status).toBe('pending');
    expect(requireImage(1).status).toBe('completed');
    expect(useImageStore.getState().isProcessing).toBe(false);
  });

  it('does nothing while a run is already in progress', async () => {
    useImageStore.setState({ isProcessing: true, images: [makeImage()] });

    await useImageStore.getState().compressImage('img-1');

    expect(tauriCompressImageMock).not.toHaveBeenCalled();
    expect(requireImage().status).toBe('pending');
  });

  it('ignores an unknown id or an image that is not pending', async () => {
    useImageStore.setState({
      images: [makeImage({ status: 'completed', compressedSize: 400 })],
    });

    await useImageStore.getState().compressImage('img-1'); // completed, not pending
    await useImageStore.getState().compressImage('nope'); // unknown

    expect(tauriCompressImageMock).not.toHaveBeenCalled();
  });
});

describe('handleExternalDrop', () => {
  beforeEach(() => {
    scanPathsForImagesMock.mockReset();
  });

  it('scans the input on the backend, then adds the resulting images', async () => {
    scanPathsForImagesMock.mockResolvedValue({
      images: ['/tmp/folder/a.png', '/tmp/folder/b.webp'],
      truncated: false,
    });

    await useImageStore.getState().handleExternalDrop(['/tmp/folder']);

    // The raw path is forwarded untouched; the backend does the filtering/expansion.
    expect(scanPathsForImagesMock).toHaveBeenCalledWith(['/tmp/folder']);
    expect(useImageStore.getState().images).toHaveLength(2);
  });

  it('warns and adds nothing when the scan finds no image', async () => {
    scanPathsForImagesMock.mockResolvedValue({ images: [], truncated: false });

    await useImageStore.getState().handleExternalDrop(['/tmp/empty']);

    expect(useImageStore.getState().images).toHaveLength(0);
    expect(toast.info).toHaveBeenCalledWith('toasts.noImagesFound');
  });

  it('warns when the scan was truncated but still adds what it got', async () => {
    scanPathsForImagesMock.mockResolvedValue({ images: ['/tmp/big/a.png'], truncated: true });

    await useImageStore.getState().handleExternalDrop(['/tmp/big']);

    expect(useImageStore.getState().images).toHaveLength(1);
    expect(toast.info).toHaveBeenCalledWith('toasts.folderTruncated:{"count":1}');
  });

  it('does not add anything when the scan fails', async () => {
    scanPathsForImagesMock.mockRejectedValue(new Error('scan task failed'));

    await useImageStore.getState().handleExternalDrop(['/tmp/x']);

    expect(useImageStore.getState().images).toHaveLength(0);
  });
});

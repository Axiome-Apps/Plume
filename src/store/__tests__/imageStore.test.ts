import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useImageStore } from '../imageStore';
import { ImageEntity } from '@/domain/image/entity';
import { AdaptiveProgressManager } from '@/domain/progress/adaptiveProgress';
import type { ImageType } from '@/domain/image/schema';
import { getFileInformation } from '@/lib/tauri';
import { sizePredictionService } from '@/domain/size-prediction';
import { toast } from 'sonner';

vi.mock('@/lib/tauri', () => ({
  getFileInformation: vi.fn(),
  compressImage: vi.fn(),
  getProgressEstimation: vi.fn(),
}));

vi.mock('@/domain/size-prediction', () => ({
  sizePredictionService: { getEstimation: vi.fn() },
}));

// Echo the interpolation options back so a test can assert what the store
// passed — the plural count in particular drives the _one / _other suffixes.
vi.mock('@/domain/i18n', () => ({
  translate: (key: string, options?: Record<string, unknown>) =>
    options ? `${key}:${JSON.stringify(options)}` : key,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const getFileInformationMock = vi.mocked(getFileInformation);
const getEstimationMock = vi.mocked(sizePredictionService.getEstimation);

const FALLBACK_ESTIMATION = { percent: 65, ratio: 0.35, confidence: 0.5, sample_count: 0 };

function makeImage(overrides: Partial<ImageType> = {}): ImageEntity {
  return ImageEntity.fromData({
    id: 'img-1',
    name: 'photo.png',
    originalSize: 1000,
    format: 'PNG',
    preview: 'blob:preview',
    path: '/tmp/photo.png',
    status: 'pending',
    ...overrides,
  });
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

beforeEach(() => {
  resetStore();
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

    const [image] = useImageStore.getState().images;
    expect(image.name).toBe('holiday.HEIC');
    expect(image.originalSize).toBe(4096);
    expect(image.format).toBe('HEIC');
    expect(image.status).toBe('pending');
  });

  it('falls back to the path when the backend cannot describe the file', async () => {
    getFileInformationMock.mockRejectedValue(new Error('no such file'));

    await useImageStore.getState().addImages(['/tmp/photo.png']);

    const [image] = useImageStore.getState().images;
    expect(image.name).toBe('photo.png');
    expect(image.format).toBe('PNG');
    expect(image.originalSize).toBe(0);
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

    expect(useImageStore.getState().images[0].estimatedCompression).toEqual({
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
    expect(useImageStore.getState().images[0].estimatedCompression).toEqual(FALLBACK_ESTIMATION);
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

    const [waiting, done] = useImageStore.getState().images;
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

    expect(useImageStore.getState().images[0].estimatedCompression).toEqual(FALLBACK_ESTIMATION);
  });
});

describe('startCompression guards', () => {
  it('does nothing while a run is already in progress', async () => {
    useImageStore.setState({ isProcessing: true, images: [makeImage()] });

    await useImageStore.getState().startCompression();

    expect(useImageStore.getState().images[0].status).toBe('pending');
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

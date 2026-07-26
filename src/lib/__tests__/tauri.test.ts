import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { CommandError } from '@/domain/errors/commandError';
import {
  compressImage,
  getCompressionEstimation,
  getFileInformation,
  getProgressEstimation,
  initDatabase,
  revealInFolder,
  scanPathsForImages,
  selectFolder,
  selectImageFiles,
} from '../tauri';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-opener', () => ({ revealItemInDir: vi.fn() }));
vi.mock('@/domain/i18n/translate', () => ({ translate: (key: string) => `translated:${key}` }));

const invokeMock = vi.mocked(invoke);

/** Make the next invoke() resolve with a raw backend payload. */
function backendReturns(payload: unknown) {
  invokeMock.mockResolvedValue(payload);
}

beforeEach(() => {
  invokeMock.mockReset();
});

describe('selectImageFiles', () => {
  it('returns the selected paths', async () => {
    backendReturns(['/tmp/a.png', '/tmp/b.jpg']);

    await expect(selectImageFiles()).resolves.toEqual(['/tmp/a.png', '/tmp/b.jpg']);
  });

  // The Rust side carries no interface text: the native dialog labels come from
  // the frontend, which is what makes the picker follow the UI language.
  it('supplies the dialog labels from the frontend', async () => {
    backendReturns([]);

    await selectImageFiles();

    expect(invokeMock).toHaveBeenCalledWith('select_image_files', {
      title: 'translated:dialog.selectImages',
      filterLabel: 'translated:dialog.imagesFilter',
    });
  });

  it('rejects a payload that is not a list of paths', async () => {
    backendReturns([1, 2]);

    await expect(selectImageFiles()).rejects.toThrow();
  });
});

describe('selectFolder', () => {
  it('returns the chosen folder path', async () => {
    backendReturns('/tmp/photos');

    await expect(selectFolder()).resolves.toBe('/tmp/photos');
  });

  it('returns null when the user cancels', async () => {
    backendReturns(null);

    await expect(selectFolder()).resolves.toBeNull();
  });

  it('supplies the dialog title from the frontend', async () => {
    backendReturns(null);

    await selectFolder();

    expect(invokeMock).toHaveBeenCalledWith('select_folder', {
      title: 'translated:dialog.selectFolder',
    });
  });
});

describe('scanPathsForImages', () => {
  it('forwards the raw paths and returns the scanned outcome', async () => {
    backendReturns({ images: ['/tmp/photos/a.png', '/tmp/photos/b.webp'], truncated: false });

    await expect(scanPathsForImages(['/tmp/photos'])).resolves.toEqual({
      images: ['/tmp/photos/a.png', '/tmp/photos/b.webp'],
      truncated: false,
    });
    expect(invokeMock).toHaveBeenCalledWith('scan_paths_for_images', { paths: ['/tmp/photos'] });
  });

  it('parses the truncated flag when the scan hit its cap', async () => {
    backendReturns({ images: ['/tmp/photos/a.png'], truncated: true });

    await expect(scanPathsForImages(['/tmp/photos'])).resolves.toMatchObject({ truncated: true });
  });

  it('rejects a payload missing the truncated flag', async () => {
    backendReturns({ images: ['/tmp/x.png'] });

    await expect(scanPathsForImages(['/tmp/x'])).rejects.toThrow();
  });
});

describe('getFileInformation', () => {
  const fileInfo = {
    path: '/tmp/photo.png',
    name: 'photo.png',
    size: 2048,
    extension: 'png',
    is_image: true,
  };

  it('parses the backend metadata', async () => {
    backendReturns(fileInfo);

    await expect(getFileInformation('/tmp/photo.png')).resolves.toEqual(fileInfo);
  });

  it('passes the path as a camelCase argument, which Tauri converts', async () => {
    backendReturns(fileInfo);

    await getFileInformation('/tmp/photo.png');

    expect(invokeMock).toHaveBeenCalledWith('get_file_information', {
      filePath: '/tmp/photo.png',
    });
  });

  // extension is Option<String> on the Rust side, and serde writes None as null
  // rather than omitting the field — the schema has to accept it.
  it('accepts a null extension for a file that has none', async () => {
    backendReturns({ ...fileInfo, extension: null });

    await expect(getFileInformation('/tmp/photo')).resolves.toMatchObject({ extension: null });
  });

  it('rejects a response missing a field', async () => {
    backendReturns({ path: '/tmp/photo.png', name: 'photo.png' });

    await expect(getFileInformation('/tmp/photo.png')).rejects.toThrow();
  });

  it('rejects a negative size', async () => {
    backendReturns({ ...fileInfo, size: -1 });

    await expect(getFileInformation('/tmp/photo.png')).rejects.toThrow();
  });
});

describe('compressImage', () => {
  const request = { file_path: '/tmp/photo.png', quality: 80, format: 'webp' as const };
  const summary = {
    original_size: 2048,
    compressed_size: 512,
    savings_percent: 75,
    output_path: '/tmp/photo_balanced.webp',
  };

  it('parses the success summary', async () => {
    backendReturns(summary);

    await expect(compressImage(request)).resolves.toEqual(summary);
  });

  // A business failure now rejects the command; the boundary turns the
  // serialized payload into a typed CommandError the store can branch on.
  it('throws a typed CommandError when the command rejects', async () => {
    invokeMock.mockRejectedValue({ kind: 'security', message: 'blocked' });

    await expect(compressImage(request)).rejects.toBeInstanceOf(CommandError);
    await expect(compressImage(request)).rejects.toMatchObject({ kind: 'security' });
  });

  it('sends the request nested under a request key, in snake_case', async () => {
    backendReturns(summary);

    await compressImage(request);

    expect(invokeMock).toHaveBeenCalledWith('compress_image', { request });
  });

  it('accepts a negative savings percentage, since a file can grow', async () => {
    backendReturns({ ...summary, original_size: 100, compressed_size: 300, savings_percent: -200 });

    await expect(compressImage(request)).resolves.toMatchObject({ savings_percent: -200 });
  });

  it('rejects a summary missing a field', async () => {
    backendReturns({ compressed_size: 512 });

    await expect(compressImage(request)).rejects.toThrow();
  });
});

describe('getProgressEstimation', () => {
  it('parses the estimated duration', async () => {
    backendReturns({ estimated_duration_ms: 1200, confidence: 0.8, sample_count: 42 });

    await expect(getProgressEstimation('png', 'webp', 2048, '/tmp/photo.png')).resolves.toEqual({
      estimated_duration_ms: 1200,
      confidence: 0.8,
      sample_count: 42,
    });
  });

  // Field names inside a struct are not renamed by serde, so the request body
  // stays snake_case even though the argument holding it is camelCase. The
  // backend derives pixel_count from file_path itself.
  it('sends a snake_case request body carrying the file path', async () => {
    backendReturns({ estimated_duration_ms: 0, confidence: 0, sample_count: 0 });

    await getProgressEstimation('png', 'webp', 2048, '/tmp/photo.png');

    expect(invokeMock).toHaveBeenCalledWith('get_progress_estimation', {
      request: {
        input_format: 'png',
        output_format: 'webp',
        original_size: 2048,
        file_path: '/tmp/photo.png',
      },
    });
  });

  it('rejects a confidence outside 0..1', async () => {
    backendReturns({ estimated_duration_ms: 1200, confidence: 1.5, sample_count: 42 });

    await expect(getProgressEstimation('png', 'webp', 2048, '/tmp/photo.png')).rejects.toThrow();
  });
});

describe('getCompressionEstimation', () => {
  const query = {
    input_format: 'png',
    output_format: 'webp',
    original_size: 2048,
    quality_setting: 80,
    lossy_mode: true,
  };

  it('parses the estimated reduction', async () => {
    backendReturns({ percent: 65, ratio: 0.35, confidence: 0.9, sample_count: 12 });

    await expect(getCompressionEstimation(query)).resolves.toEqual({
      percent: 65,
      ratio: 0.35,
      confidence: 0.9,
      sample_count: 12,
    });
  });

  // The database clamps recorded reductions to 0..99, but a stored stat can
  // still describe a file that grew, so the schema allows a negative percent.
  it('accepts a negative reduction', async () => {
    backendReturns({ percent: -40, ratio: 1.4, confidence: 0.3, sample_count: 2 });

    await expect(getCompressionEstimation(query)).resolves.toMatchObject({ percent: -40 });
  });

  it('rejects a reduction beyond 100%', async () => {
    backendReturns({ percent: 140, ratio: 0.1, confidence: 0.9, sample_count: 12 });

    await expect(getCompressionEstimation(query)).rejects.toThrow();
  });
});

describe('thin passthroughs', () => {
  it('initDatabase invokes the command and returns nothing', async () => {
    backendReturns(undefined);

    await expect(initDatabase()).resolves.toBeUndefined();
    expect(invokeMock).toHaveBeenCalledWith('init_database', undefined);
  });

  it('revealInFolder delegates to the opener plugin rather than a command', async () => {
    await revealInFolder('/tmp/photo_balanced.webp');

    expect(revealItemInDir).toHaveBeenCalledWith('/tmp/photo_balanced.webp');
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

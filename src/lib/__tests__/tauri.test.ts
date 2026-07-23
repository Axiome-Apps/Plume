import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import {
  compressImage,
  getCompressionEstimation,
  getFileInformation,
  getProgressEstimation,
  initDatabase,
  revealInFolder,
  selectImageFiles,
} from '../tauri';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-opener', () => ({ revealItemInDir: vi.fn() }));
vi.mock('@/domain/i18n', () => ({ translate: (key: string) => `translated:${key}` }));

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

  it('parses a successful compression', async () => {
    backendReturns({
      success: true,
      result: {
        original_size: 2048,
        compressed_size: 512,
        savings_percent: 75,
        output_path: '/tmp/photo_balanced.webp',
      },
      error: null,
    });

    const response = await compressImage(request);

    expect(response.success).toBe(true);
    expect(response.result?.compressed_size).toBe(512);
  });

  it('parses a failure, where result is null and error carries the reason', async () => {
    backendReturns({ success: false, result: null, error: 'Permission denied' });

    const response = await compressImage(request);

    expect(response.success).toBe(false);
    expect(response.result).toBeNull();
    expect(response.error).toBe('Permission denied');
  });

  it('sends the request nested under a request key, in snake_case', async () => {
    backendReturns({ success: true, result: null, error: null });

    await compressImage(request);

    expect(invokeMock).toHaveBeenCalledWith('compress_image', { request });
  });

  it('accepts a negative savings percentage, since a file can grow', async () => {
    backendReturns({
      success: true,
      result: {
        original_size: 100,
        compressed_size: 300,
        savings_percent: -200,
        output_path: '/tmp/out.webp',
      },
      error: null,
    });

    await expect(compressImage(request)).resolves.toMatchObject({
      result: { savings_percent: -200 },
    });
  });

  it('rejects a response whose success flag is missing', async () => {
    backendReturns({ result: null, error: null });

    await expect(compressImage(request)).rejects.toThrow();
  });
});

describe('getProgressEstimation', () => {
  it('parses the estimated duration', async () => {
    backendReturns({ estimated_duration_ms: 1200, confidence: 0.8, sample_count: 42 });

    await expect(getProgressEstimation('png', 'webp', 2048)).resolves.toEqual({
      estimated_duration_ms: 1200,
      confidence: 0.8,
      sample_count: 42,
    });
  });

  // Field names inside a struct are not renamed by serde, so the request body
  // stays snake_case even though the argument holding it is camelCase.
  it('sends a snake_case request body', async () => {
    backendReturns({ estimated_duration_ms: 0, confidence: 0, sample_count: 0 });

    await getProgressEstimation('png', 'webp', 2048);

    expect(invokeMock).toHaveBeenCalledWith('get_progress_estimation', {
      request: { input_format: 'png', output_format: 'webp', original_size: 2048 },
    });
  });

  it('rejects a confidence outside 0..1', async () => {
    backendReturns({ estimated_duration_ms: 1200, confidence: 1.5, sample_count: 42 });

    await expect(getProgressEstimation('png', 'webp', 2048)).rejects.toThrow();
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
    expect(invokeMock).toHaveBeenCalledWith('init_database');
  });

  it('revealInFolder delegates to the opener plugin rather than a command', async () => {
    await revealInFolder('/tmp/photo_balanced.webp');

    expect(revealItemInDir).toHaveBeenCalledWith('/tmp/photo_balanced.webp');
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

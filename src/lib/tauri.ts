import { invoke } from '@tauri-apps/api/core';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import {
  CompressImageResponseSchema,
  type CompressImageResponseType,
  type CompressionLevelType,
} from '@/domain/compression/schema';
import { FileInfoSchema, SelectedFilesSchema, type FileInfoType } from '@/domain/image/schema';
import { translate } from '@/domain/i18n';
import {
  EstimationResultSchema,
  ProgressEstimationSchema,
  type EstimationResultType,
  type EstimationQueryType,
  type ProgressEstimationType,
} from '@/domain/size-prediction/schema';

/**
 * Single IPC boundary (ADR-0004). Every response is parsed here so the rest of
 * the app can trust its inputs without revalidating: this is the external
 * frontier, and nothing downstream re-parses.
 *
 * Request field names are snake_case when they travel inside a struct (serde
 * does not rename), camelCase when they are top-level command arguments
 * (Tauri converts those itself).
 */

interface CompressImageRequest {
  file_path: string;
  quality?: number;
  format?: string;
  level?: CompressionLevelType;
}

export type { CompressImageResponseType as CompressImageResponse, FileInfoType };

// ====== DATABASE ======

export async function initDatabase(): Promise<void> {
  await invoke('init_database');
}

// ====== FILE OPERATIONS ======

export async function selectImageFiles(): Promise<string[]> {
  return SelectedFilesSchema.parse(
    await invoke('select_image_files', { title: translate('dialog.selectImages') })
  );
}

export async function getFileInformation(filePath: string): Promise<FileInfoType> {
  return FileInfoSchema.parse(await invoke('get_file_information', { filePath }));
}

export async function revealInFolder(filePath: string): Promise<void> {
  await revealItemInDir(filePath);
}

// ====== COMPRESSION ======

export async function compressImage(
  request: CompressImageRequest
): Promise<CompressImageResponseType> {
  return CompressImageResponseSchema.parse(await invoke('compress_image', { request }));
}

// ====== STATS & ESTIMATION ======

export async function getProgressEstimation(
  inputFormat: string,
  outputFormat: string,
  originalSize: number
): Promise<ProgressEstimationType> {
  return ProgressEstimationSchema.parse(
    await invoke('get_progress_estimation', {
      request: {
        input_format: inputFormat,
        output_format: outputFormat,
        original_size: originalSize,
      },
    })
  );
}

export async function getCompressionEstimation(
  request: EstimationQueryType
): Promise<EstimationResultType> {
  return EstimationResultSchema.parse(await invoke('get_compression_estimation', { request }));
}

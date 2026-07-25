import { invoke, type InvokeArgs } from '@tauri-apps/api/core';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import {
  CompressionSummarySchema,
  type CompressionSummaryType,
  type CompressionLevelType,
} from '@/domain/compression/schema';
import { CommandError } from '@/domain/errors/commandError';
import { DragDropEvent } from '@/domain/drag-drop/entity';
import { FileInfoSchema, SelectedFilesSchema, type FileInfoType } from '@/domain/image/schema';
import { translate } from '@/domain/i18n/translate';
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

/**
 * Wraps `invoke` so a command rejection — the serialized `CommandError` from
 * Rust — surfaces as a typed `CommandError` the caller can branch on by `kind`.
 */
async function invokeCommand(command: string, args?: InvokeArgs): Promise<unknown> {
  try {
    return await invoke(command, args);
  } catch (raw) {
    throw CommandError.from(raw);
  }
}

interface CompressImageRequest {
  file_path: string;
  quality?: number;
  format?: string;
  level?: CompressionLevelType;
}

// ====== DATABASE ======

export async function initDatabase(): Promise<void> {
  await invokeCommand('init_database');
}

// ====== FILE OPERATIONS ======

export async function selectImageFiles(): Promise<string[]> {
  return SelectedFilesSchema.parse(
    await invokeCommand('select_image_files', {
      title: translate('dialog.selectImages'),
      filterLabel: translate('dialog.imagesFilter'),
    })
  );
}

export async function getFileInformation(filePath: string): Promise<FileInfoType> {
  return FileInfoSchema.parse(await invokeCommand('get_file_information', { filePath }));
}

export async function revealInFolder(filePath: string): Promise<void> {
  await revealItemInDir(filePath);
}

// ====== EVENTS ======

/**
 * Native drag & drop is a webview event channel — part of the IPC boundary
 * (ADR-0004). The raw event is parsed here; consumers receive a validated
 * domain event and never import `@tauri-apps/api` themselves. Returns the
 * unlisten function.
 */
export async function onDragDrop(handler: (event: DragDropEvent) => void): Promise<() => void> {
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  return getCurrentWebviewWindow().onDragDropEvent(rawEvent => {
    let event: DragDropEvent;
    try {
      event = DragDropEvent.fromRaw(rawEvent);
    } catch (error) {
      console.error('onDragDrop: invalid drag & drop event:', error);
      return;
    }
    handler(event);
  });
}

// ====== COMPRESSION ======

export async function compressImage(
  request: CompressImageRequest
): Promise<CompressionSummaryType> {
  return CompressionSummarySchema.parse(await invokeCommand('compress_image', { request }));
}

// ====== STATS & ESTIMATION ======

export async function getProgressEstimation(
  inputFormat: string,
  outputFormat: string,
  originalSize: number,
  filePath: string
): Promise<ProgressEstimationType> {
  return ProgressEstimationSchema.parse(
    await invokeCommand('get_progress_estimation', {
      request: {
        input_format: inputFormat,
        output_format: outputFormat,
        original_size: originalSize,
        file_path: filePath,
      },
    })
  );
}

export async function getCompressionEstimation(
  request: EstimationQueryType
): Promise<EstimationResultType> {
  return EstimationResultSchema.parse(
    await invokeCommand('get_compression_estimation', { request })
  );
}

import { invoke } from '@tauri-apps/api/core';

// ====== TYPES ======

interface CompressImageRequest {
  file_path: string;
  quality?: number;
  format?: string;
}

interface CompressImageResult {
  compressed_size: number;
  output_path: string;
}

export interface CompressImageResponse {
  success: boolean;
  result?: CompressImageResult;
  error?: string;
}

interface ProgressEstimation {
  estimated_duration_ms: number;
  confidence: number;
  sample_count: number;
}

interface EstimationResult {
  percent: number;
  ratio: number;
  confidence: number;
  sample_count: number;
}

// ====== DATABASE ======

export async function initDatabase(): Promise<void> {
  await invoke<string>('init_database');
}

// ====== FILE OPERATIONS ======

export async function selectImageFiles(): Promise<string[]> {
  return invoke<string[]>('select_image_files');
}

export async function getFileInformation(filePath: string): Promise<{ size: number }> {
  return invoke<{ size: number }>('get_file_information', { filePath });
}

// ====== COMPRESSION ======

export async function compressImage(
  request: CompressImageRequest,
  imageId: string
): Promise<CompressImageResponse> {
  return invoke<CompressImageResponse>('compress_image', {
    request,
    imageId,
  });
}

// ====== STATS & ESTIMATION ======

export async function getProgressEstimation(
  inputFormat: string,
  outputFormat: string,
  originalSize: number
): Promise<ProgressEstimation> {
  return invoke<ProgressEstimation>('get_progress_estimation', {
    request: {
      input_format: inputFormat,
      output_format: outputFormat,
      original_size: originalSize,
    },
  });
}

export async function getCompressionEstimation(request: {
  input_format: string;
  output_format: string;
  original_size: number;
  quality_setting: number;
  lossy_mode: boolean;
}): Promise<EstimationResult> {
  return invoke<EstimationResult>('get_compression_estimation', { request });
}

export async function recordCompressionStat(request: {
  input_format: string;
  output_format: string;
  original_size: number;
  compressed_size: number;
  quality_setting: number;
  lossy_mode: boolean;
}): Promise<number> {
  return invoke<number>('record_compression_stat', { request });
}

export async function resetCompressionStats(): Promise<void> {
  await invoke('reset_compression_stats');
}

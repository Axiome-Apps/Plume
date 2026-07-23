import { z } from 'zod';
import { EstimationResultSchema } from '@/domain/size-prediction/schema';
import { IMAGE_FORMATS } from '@/domain/constants';

// Main image schema
export const ImageSchema = z.object({
  // Base properties (always present)
  id: z.string(),
  name: z.string(),
  originalSize: z.number().positive(),
  format: z.enum(IMAGE_FORMATS).transform(f => f.toUpperCase() as 'PNG' | 'JPEG' | 'WEBP' | 'HEIC'),
  preview: z.string(),
  path: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'error']),

  // Status-dependent properties
  estimatedCompression: EstimationResultSchema.optional(),
  progress: z.number().min(0).max(100).optional(),
  compressedSize: z.number().positive().optional(),
  savings: z.number().min(0).max(100).optional(),
  outputPath: z.string().optional(),
});

// IPC contract — mirrors FileInfo in src-tauri/src/commands/file.rs.
// extension is Option<String> on the Rust side, hence nullish.
export const FileInfoSchema = z.object({
  path: z.string(),
  name: z.string(),
  size: z.number().nonnegative(),
  extension: z.string().nullish(),
  is_image: z.boolean(),
});

export const SelectedFilesSchema = z.array(z.string());

// Main types - convention: SchemaName + Type
export type ImageType = z.infer<typeof ImageSchema>;
export type ImageStatus = ImageType['status'];
export type FileInfoType = z.infer<typeof FileInfoSchema>;

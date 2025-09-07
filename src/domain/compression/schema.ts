import { z } from 'zod';
import { COMPRESSION_OUTPUT_FORMATS } from '@/domain/constants';

// Schéma pour une requête de compression
export const CompressImageRequestSchema = z.object({
  input_path: z.string(),
  output_path: z.string(),
  quality: z.number().min(1).max(100),
  output_format: z.enum(COMPRESSION_OUTPUT_FORMATS),
  lossy_mode: z.boolean().optional().default(false),
});

// Schéma pour une réponse de compression
export const CompressImageResponseSchema = z.object({
  success: z.boolean(),
  output_path: z.string().optional(),
  original_size: z.number().optional(),
  compressed_size: z.number().optional(),
  savings_percent: z.number().optional(),
  error: z.string().optional(),
});

// Types - Convention: SchemaName + Type
export type CompressImageRequestType = z.infer<typeof CompressImageRequestSchema>;
export type CompressImageResponseType = z.infer<typeof CompressImageResponseSchema>;

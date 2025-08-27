import { z } from "zod";

// Schema pour les formats de sortie
export const OutputFormatSchema = z.enum(['png', 'jpeg', 'webp', 'auto']);

// Schema pour les paramètres de compression
export const CompressionSettingsSchema = z.object({
  keepOriginalFormat: z.boolean().default(false),
  lossyMode: z.boolean().default(true),
  quality: z.number().min(1).max(100).default(80),
  outputFormat: OutputFormatSchema.default('webp'),
});

// Schema pour les requêtes de compression
export const CompressImageRequestSchema = z.object({
  file_path: z.string(),
  quality: z.number().min(1).max(100).optional(),
  format: OutputFormatSchema.optional(),
});

// Schema pour les résultats de compression
export const CompressionResultSchema = z.object({
  original_size: z.number().positive(),
  compressed_size: z.number().positive(),
  savings_percent: z.number().min(0).max(100),
  compressed_data: z.array(z.number()), // Vec<u8> from Rust
});

// Schema pour les réponses de compression
export const CompressImageResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  result: CompressionResultSchema.optional(),
  output_path: z.string().optional(),
});

// Inférence des types TypeScript
export type OutputFormat = z.infer<typeof OutputFormatSchema>;
export type CompressionSettings = z.infer<typeof CompressionSettingsSchema>;
export type CompressImageRequest = z.infer<typeof CompressImageRequestSchema>;
export type CompressionResult = z.infer<typeof CompressionResultSchema>;
export type CompressImageResponse = z.infer<typeof CompressImageResponseSchema>;

// Constantes pour les formats
export const SupportedFormats = {
  PNG: 'png',
  JPEG: 'jpeg',
  WEBP: 'webp',
  AUTO: 'auto',
} as const;
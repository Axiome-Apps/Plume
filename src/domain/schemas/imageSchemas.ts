import { z } from "zod";

// Schema de base pour une image
export const BaseImageSchema = z.object({
  id: z.string(),
  name: z.string(),
  originalSize: z.number().positive(),
  format: z.enum(['PNG', 'JPG', 'JPEG', 'WEBP']),
  preview: z.string(), // base64 data URL
  path: z.string(),
});

// Schema pour l'estimation de compression
export const CompressionEstimationSchema = z.object({
  percent: z.number().min(0).max(100),
  ratio: z.number().min(0).max(1),
});

// Schemas pour les différents états d'image
export const PendingImageSchema = BaseImageSchema.extend({
  status: z.literal('pending'),
  estimatedCompression: CompressionEstimationSchema,
});

export const ProcessingImageSchema = BaseImageSchema.extend({
  status: z.literal('processing'),
  progress: z.number().min(0).max(100),
});

export const CompletedImageSchema = BaseImageSchema.extend({
  status: z.literal('completed'),
  compressedSize: z.number().positive(),
  savings: z.number().min(0).max(100),
  outputPath: z.string().optional(),
});

// Union schema pour tous les états d'image
export const ImageDataSchema = z.union([
  PendingImageSchema,
  ProcessingImageSchema,
  CompletedImageSchema,
]);

// Schema pour les fichiers droppés/sélectionnés
export const DroppedFileSchema = z.object({
  path: z.string(),
  preview: z.string(),
});

// Inférence des types TypeScript depuis les schemas Zod
export type BaseImage = z.infer<typeof BaseImageSchema>;
export type CompressionEstimation = z.infer<typeof CompressionEstimationSchema>;
export type PendingImage = z.infer<typeof PendingImageSchema>;
export type ProcessingImage = z.infer<typeof ProcessingImageSchema>;
export type CompletedImage = z.infer<typeof CompletedImageSchema>;
export type ImageData = z.infer<typeof ImageDataSchema>;
export type DroppedFile = z.infer<typeof DroppedFileSchema>;

// Status enum pour faciliter les comparaisons
export const ImageStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
} as const;

export type ImageStatusType = typeof ImageStatus[keyof typeof ImageStatus];
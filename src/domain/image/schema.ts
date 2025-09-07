import { z } from 'zod';
import { EstimationResultSchema } from '@/domain/size-prediction/schema';
import { IMAGE_FORMATS } from '@/domain/constants';

// Schema principal pour une image
export const ImageSchema = z.object({
  // Propriétés de base (toujours présentes)
  id: z.string(),
  name: z.string(),
  originalSize: z.number().positive(),
  format: z.enum(IMAGE_FORMATS).transform(f => f.toUpperCase() as 'PNG' | 'JPEG' | 'WEBP'),
  preview: z.string(),
  path: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'error']),

  // Propriétés conditionnelles selon le status
  estimatedCompression: EstimationResultSchema.optional(),
  progress: z.number().min(0).max(100).optional(),
  compressedSize: z.number().positive().optional(),
  savings: z.number().min(0).max(100).optional(),
  outputPath: z.string().optional(),
});

// Types principaux - Convention: SchemaName + Type
export type ImageType = z.infer<typeof ImageSchema>;
export type ImageStatus = ImageType['status'];

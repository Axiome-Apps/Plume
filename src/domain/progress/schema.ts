import { z } from 'zod';

// Schemas pour l'estimation de progression
export const ProgressEstimationRequestSchema = z.object({
  input_format: z.string(),
  output_format: z.string(),
  original_size: z.number().positive(),
  quality_setting: z.number().min(1).max(100),
  lossy_mode: z.boolean(),
});

export const ProgressEstimationResponseSchema = z.object({
  estimated_duration_ms: z.number().positive(),
  confidence: z.number().min(0).max(1),
  sample_count: z.number().nonnegative(),
  progress_config: z.object({
    estimated_duration_ms: z.number().positive(),
    update_interval_ms: z.number().positive(),
    easing_function: z.enum(['linear', 'ease_out', 'bezier']),
    completion_threshold: z.number().min(0).max(100),
  }),
});

// Schemas pour la configuration de progression
export const ProgressConfigSchema = z.object({
  estimated_duration_ms: z.number().positive(),
  update_interval_ms: z.number().positive().default(50),
  easing_function: z.enum(['linear', 'ease_out', 'bezier']).default('ease_out'),
  completion_threshold: z.number().min(0).max(100).default(95),
});

// Schemas pour l'état de progression
export const ProgressStateSchema = z.object({
  progress_percent: z.number().min(0).max(100),
  is_active: z.boolean(),
  start_time: z.number().optional(), // timestamp
  elapsed_ms: z.number().nonnegative().optional(),
  estimated_remaining_ms: z.number().nonnegative().optional(),
});

// Schema pour les événements de progression
export const ProgressEventSchema = z.object({
  image_id: z.string(),
  progress_percent: z.number().min(0).max(100),
  stage: z.enum(['started', 'processing', 'completed', 'error']),
  timestamp: z.number(),
});

// Types inférés
export type ProgressEstimationRequestType = z.infer<typeof ProgressEstimationRequestSchema>;
export type ProgressEstimationResponseType = z.infer<typeof ProgressEstimationResponseSchema>;
export type ProgressConfigType = z.infer<typeof ProgressConfigSchema>;
export type ProgressStateType = z.infer<typeof ProgressStateSchema>;
export type ProgressEventType = z.infer<typeof ProgressEventSchema>;

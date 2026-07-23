import { z } from 'zod';

// Estimation query schema
export const EstimationQuerySchema = z.object({
  input_format: z.string(),
  output_format: z.string(),
  original_size: z.number().positive(),
  quality_setting: z.number().min(0).max(100),
  lossy_mode: z.boolean(),
});

// Estimation result schema
// percent can be negative (file grows after compression)
// ratio can be > 1 (compressed size > original)
export const EstimationResultSchema = z.object({
  percent: z.number().min(-100).max(100),
  ratio: z.number().min(0),
  confidence: z.number().min(0).max(1),
  sample_count: z.number().min(0),
});

// IPC contract — mirrors ProgressEstimationResult in
// src-tauri/src/commands/stats.rs
export const ProgressEstimationSchema = z.object({
  estimated_duration_ms: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  sample_count: z.number().min(0),
});

export type ProgressEstimationType = z.infer<typeof ProgressEstimationSchema>;

// Schema enriching the existing estimation in imageSchemas
export const EnhancedCompressionEstimationSchema = z.object({
  percent: z.number().min(-100).max(100),
  ratio: z.number().min(0),
  confidence: z.number().min(0).max(1),
  sample_count: z.number().min(0),
  is_learning: z.boolean(),
  description: z.string().optional(),
});

// TypeScript type inference - convention: SchemaName + Type
export type EstimationQueryType = z.infer<typeof EstimationQuerySchema>;
export type EstimationResultType = z.infer<typeof EstimationResultSchema>;
export type EnhancedCompressionEstimationType = z.infer<typeof EnhancedCompressionEstimationSchema>;

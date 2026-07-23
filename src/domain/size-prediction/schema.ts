import { z } from 'zod';

// Size range schema
export const SizeRangeSchema = z.enum(['small', 'medium', 'large']);

// Compression stat schema (simplified)
export const CompressionStatSchema = z.object({
  id: z.number().optional(),
  input_format: z.string(),
  output_format: z.string(),
  input_size_range: SizeRangeSchema,
  quality_setting: z.number().min(0).max(100),
  lossy_mode: z.boolean(),
  size_reduction_percent: z.number().min(0).max(100),
  original_size: z.number().positive(),
  compressed_size: z.number().positive(),
  timestamp: z.string(),
});

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

// Estimation display schema (enriched version)
export const EstimationDisplaySchema = EstimationResultSchema.extend({
  confidence_level: z.enum(['low', 'medium', 'high']),
  description: z.string(),
  is_learning: z.boolean(), // true when based on user data
});

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
export type SizeRangeType = z.infer<typeof SizeRangeSchema>;
export type CompressionStatType = z.infer<typeof CompressionStatSchema>;
export type EstimationQueryType = z.infer<typeof EstimationQuerySchema>;
export type EstimationResultType = z.infer<typeof EstimationResultSchema>;
export type EstimationDisplayType = z.infer<typeof EstimationDisplaySchema>;
export type EnhancedCompressionEstimationType = z.infer<typeof EnhancedCompressionEstimationSchema>;

// Useful constants
export const SIZE_THRESHOLDS = {
  SMALL_MAX: 1_000_000, // 1MB
  MEDIUM_MAX: 5_000_000, // 5MB
} as const;

export const CONFIDENCE_LEVELS = {
  LOW: 0.3,
  MEDIUM: 0.6,
  HIGH: 0.9,
} as const;

// Helper resolving the size range
export const getSizeRange = (sizeInBytes: number): SizeRangeType => {
  if (sizeInBytes < SIZE_THRESHOLDS.SMALL_MAX) {
    return 'small';
  } else if (sizeInBytes < SIZE_THRESHOLDS.MEDIUM_MAX) {
    return 'medium';
  } else {
    return 'large';
  }
};

// Helper resolving the confidence level
export const getConfidenceLevel = (confidence: number): 'low' | 'medium' | 'high' => {
  if (confidence >= CONFIDENCE_LEVELS.HIGH) {
    return 'high';
  } else if (confidence >= CONFIDENCE_LEVELS.MEDIUM) {
    return 'medium';
  } else {
    return 'low';
  }
};

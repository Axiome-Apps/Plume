import {
  EstimationQuerySchema,
  EstimationResultSchema,
  EnhancedCompressionEstimationType,
  EnhancedCompressionEstimationSchema,
} from './schema';
import { getCompressionEstimation, resetCompressionStats } from '@/lib/tauri';

export class CompressionEstimationService {
  async getEstimation(
    inputFormat: string,
    outputFormat: string,
    originalSize: number,
    qualitySetting: number,
    lossyMode: boolean
  ): Promise<EnhancedCompressionEstimationType> {
    const query = EstimationQuerySchema.parse({
      input_format: inputFormat.toLowerCase(),
      output_format: outputFormat.toLowerCase(),
      original_size: originalSize,
      quality_setting: qualitySetting,
      lossy_mode: lossyMode,
    });

    try {
      const result = await getCompressionEstimation(query);
      const validatedResult = EstimationResultSchema.parse(result);
      return this.enhanceEstimation(validatedResult, inputFormat, outputFormat);
    } catch {
      return this.getFallbackEstimation(inputFormat, outputFormat, lossyMode);
    }
  }

  async resetAllStats(): Promise<void> {
    await resetCompressionStats();
  }

  private enhanceEstimation(
    result: { percent: number; ratio: number; confidence: number; sample_count: number },
    inputFormat: string,
    outputFormat: string
  ): EnhancedCompressionEstimationType {
    const isLearning = result.sample_count > 0;

    let description = isLearning
      ? `Basé sur ${result.sample_count} compression${result.sample_count > 1 ? 's' : ''} similaire${result.sample_count > 1 ? 's' : ''}`
      : 'Estimation basée sur des données de référence';

    if (inputFormat.toLowerCase() !== outputFormat.toLowerCase()) {
      description += ` (${inputFormat.toUpperCase()} → ${outputFormat.toUpperCase()})`;
    }

    return EnhancedCompressionEstimationSchema.parse({
      percent: Math.round(result.percent * 100) / 100,
      ratio: Math.round(result.ratio * 1000) / 1000,
      confidence: result.confidence,
      sample_count: result.sample_count,
      is_learning: isLearning,
      description,
    });
  }

  private getFallbackEstimation(
    inputFormat: string,
    outputFormat: string,
    lossyMode: boolean
  ): EnhancedCompressionEstimationType {
    const inputLower = inputFormat.toLowerCase();
    const outputLower = outputFormat.toLowerCase();

    let percent = 10;
    if (inputLower === 'png' && outputLower === 'webp') {
      percent = lossyMode ? 65 : 20;
    } else if (inputLower === 'jpeg' && outputLower === 'webp') {
      percent = 8;
    } else if (inputLower === 'png' && outputLower === 'png') {
      percent = 12;
    } else if (inputLower === 'jpeg' && outputLower === 'jpeg') {
      percent = 15;
    }

    return EnhancedCompressionEstimationSchema.parse({
      percent,
      ratio: (100 - percent) / 100,
      confidence: 0.3,
      sample_count: 0,
      is_learning: false,
      description: `Estimation par défaut (${inputFormat.toUpperCase()} → ${outputFormat.toUpperCase()})`,
    });
  }
}

export const sizePredictionService = new CompressionEstimationService();

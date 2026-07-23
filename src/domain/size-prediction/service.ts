import {
  EstimationQuerySchema,
  EnhancedCompressionEstimationType,
  EnhancedCompressionEstimationSchema,
} from './schema';
import { getCompressionEstimation } from '@/lib/tauri';
import { translate } from '@/domain/i18n';

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
      // Already parsed at the IPC boundary (lib/tauri.ts) — no revalidation here.
      const result = await getCompressionEstimation(query);
      return this.enhanceEstimation(result, inputFormat, outputFormat);
    } catch {
      return this.getFallbackEstimation(inputFormat, outputFormat, lossyMode);
    }
  }

  private enhanceEstimation(
    result: { percent: number; ratio: number; confidence: number; sample_count: number },
    inputFormat: string,
    outputFormat: string
  ): EnhancedCompressionEstimationType {
    const isLearning = result.sample_count > 0;

    let description = isLearning
      ? translate('estimation.basedOnSamples', { count: result.sample_count })
      : translate('estimation.referenceData');

    if (inputFormat.toLowerCase() !== outputFormat.toLowerCase()) {
      description += ` ${conversionSuffix(inputFormat, outputFormat)}`;
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
      description: `${translate('estimation.fallback')} ${conversionSuffix(inputFormat, outputFormat)}`,
    });
  }
}

function conversionSuffix(inputFormat: string, outputFormat: string): string {
  return translate('estimation.conversion', {
    from: inputFormat.toUpperCase(),
    to: outputFormat.toUpperCase(),
  });
}

export const sizePredictionService = new CompressionEstimationService();

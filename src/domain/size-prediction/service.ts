import { invoke } from '@tauri-apps/api/core';
import {
  CompressionStatType,
  CompressionStatSchema,
  EstimationQueryType,
  EstimationQuerySchema,
  EstimationResultType,
  EstimationResultSchema,
  getSizeRange,
  EnhancedCompressionEstimationType,
  EnhancedCompressionEstimationSchema,
} from './schema';

export class CompressionEstimationService {
  /**
   * Obtient une estimation intelligente de compression
   */
  async getEstimation(
    inputFormat: string,
    outputFormat: string,
    originalSize: number,
    qualitySetting: number,
    lossyMode: boolean
  ): Promise<EnhancedCompressionEstimationType> {
    const query: EstimationQueryType = EstimationQuerySchema.parse({
      input_format: inputFormat.toLowerCase(),
      output_format: outputFormat.toLowerCase(),
      original_size: originalSize,
      quality_setting: qualitySetting,
      lossy_mode: lossyMode,
    });

    try {
      const result = await invoke<EstimationResultType>('get_compression_estimation', { query });
      const validatedResult = EstimationResultSchema.parse(result);

      return this.enhanceEstimation(validatedResult, inputFormat, outputFormat);
    } catch (error) {
      console.warn("Erreur lors de l'estimation via DB, utilisation du fallback:", error);
      return this.getFallbackEstimation(inputFormat, outputFormat, lossyMode);
    }
  }

  /**
   * Enregistre une statistique de compression réelle
   */
  async recordCompressionResult(
    inputFormat: string,
    outputFormat: string,
    originalSize: number,
    compressedSize: number,
    qualitySetting: number,
    lossyMode: boolean
  ): Promise<void> {
    const sizeReductionPercent = ((originalSize - compressedSize) / originalSize) * 100;

    const stat: CompressionStatType = CompressionStatSchema.parse({
      input_format: inputFormat.toLowerCase(),
      output_format: outputFormat.toLowerCase(),
      input_size_range: getSizeRange(originalSize),
      quality_setting: qualitySetting,
      lossy_mode: lossyMode,
      size_reduction_percent: Math.round(sizeReductionPercent * 100) / 100,
      original_size: originalSize,
      compressed_size: compressedSize,
      timestamp: new Date().toISOString(),
    });

    try {
      await invoke<number>('record_compression_stat', { stat });
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la statistique:", error);
    }
  }

  /**
   * Remet à zéro toutes les statistiques (feature de reset)
   */
  async resetAllStats(): Promise<void> {
    try {
      await invoke('reset_compression_stats');
    } catch (error) {
      console.error('Erreur lors de la remise à zéro:', error);
      throw error;
    }
  }

  /**
   * Enrichit le résultat d'estimation avec des métadonnées utiles
   */
  private enhanceEstimation(
    result: EstimationResultType,
    inputFormat: string,
    outputFormat: string
  ): EnhancedCompressionEstimationType {
    const isLearning = result.sample_count > 0;

    let description = '';
    if (isLearning) {
      description = `Basé sur ${result.sample_count} compression${result.sample_count > 1 ? 's' : ''} similaire${result.sample_count > 1 ? 's' : ''}`;
    } else {
      description = 'Estimation basée sur des données de référence';
    }

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

  /**
   * Estimation de fallback si la DB n'est pas disponible
   */
  private getFallbackEstimation(
    inputFormat: string,
    outputFormat: string,
    lossyMode: boolean
  ): EnhancedCompressionEstimationType {
    const inputLower = inputFormat.toLowerCase();
    const outputLower = outputFormat.toLowerCase();

    let percent = 10; // Par défaut très conservateur

    // Logique de fallback basée sur les données connues
    if (inputLower === 'png' && outputLower === 'webp') {
      percent = lossyMode ? 65 : 20; // Moins agressif que les 98% originaux
    } else if (inputLower === 'jpeg' && outputLower === 'webp') {
      percent = 25;
    } else if (inputLower === 'png' && outputLower === 'png') {
      percent = 12; // Optimisation PNG
    } else if (inputLower === 'jpeg' && outputLower === 'jpeg') {
      percent = 18; // Optimisation JPEG
    }

    return EnhancedCompressionEstimationSchema.parse({
      percent,
      ratio: (100 - percent) / 100,
      confidence: 0.3, // Faible confiance pour le fallback
      sample_count: 0,
      is_learning: false,
      description: `Estimation par défaut (${inputFormat.toUpperCase()} → ${outputFormat.toUpperCase()})`,
    });
  }

  /**
   * Détecte automatiquement le type d'image (feature future)
   */
  detectImageType(fileName: string, size: number): 'photo' | 'logo' | 'graphic' | undefined {
    const nameLower = fileName.toLowerCase();

    // Heuristiques simples pour commencer
    if (nameLower.includes('logo') || nameLower.includes('icon')) {
      return 'logo';
    }

    if (nameLower.includes('photo') || nameLower.includes('img') || nameLower.includes('picture')) {
      return 'photo';
    }

    // Basé sur la taille : les logos sont généralement plus petits
    if (size < 100_000) {
      // 100KB
      return 'logo';
    }

    if (size > 1_000_000) {
      // 1MB
      return 'photo';
    }

    return 'graphic'; // Par défaut
  }
}

// Instance singleton
export const sizePredictionService = new CompressionEstimationService();

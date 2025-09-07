import { invoke } from '@tauri-apps/api/core';
import {
  ProgressEstimationRequestType,
  ProgressEstimationResponseType,
  ProgressConfigType,
} from './schema';
import { ImageProgressManager } from './entity';

/**
 * Service pour l'estimation et la gestion de progression
 * Interface avec les commandes Tauri backend
 */
export class ProgressService {
  private progressManagers = new Map<string, ImageProgressManager>();

  /**
   * Obtient une estimation de temps de compression depuis le backend
   */
  async getProgressEstimation(
    request: ProgressEstimationRequestType
  ): Promise<ProgressEstimationResponseType> {
    try {
      const response = await invoke<ProgressEstimationResponseType>('get_progress_estimation', {
        request,
      });
      return response;
    } catch (error) {
      console.error('Failed to get progress estimation:', error);
      // Fallback avec valeurs par défaut
      return {
        estimated_duration_ms: 1000, // 1 seconde par défaut
        confidence: 0.3, // Faible confiance pour fallback
        sample_count: 0,
        progress_config: {
          estimated_duration_ms: 1000,
          update_interval_ms: 50,
          easing_function: 'ease_out',
          completion_threshold: 95,
        },
      };
    }
  }

  /**
   * Crée une configuration de progression personnalisée
   */
  async createProgressConfig(
    estimatedDurationMs: number,
    options?: {
      updateIntervalMs?: number;
      easingFunction?: 'linear' | 'ease_out' | 'bezier';
      completionThreshold?: number;
    }
  ): Promise<ProgressConfigType> {
    try {
      const response = await invoke<ProgressConfigType>('create_progress_config', {
        estimated_duration_ms: estimatedDurationMs,
        update_interval_ms: options?.updateIntervalMs,
        easing_function: options?.easingFunction,
        completion_threshold: options?.completionThreshold,
      });
      return response;
    } catch (error) {
      console.error('Failed to create progress config:', error);
      // Fallback avec configuration par défaut
      return {
        estimated_duration_ms: estimatedDurationMs,
        update_interval_ms: options?.updateIntervalMs ?? 50,
        easing_function: options?.easingFunction ?? 'ease_out',
        completion_threshold: options?.completionThreshold ?? 95,
      };
    }
  }

  /**
   * Démarre la progression pour une image donnée
   */
  startImageProgress(
    imageId: string,
    config: ProgressConfigType,
    callbacks: {
      onProgress?: (imageId: string, progress: number) => void;
      onComplete?: (imageId: string) => void;
      onError?: (imageId: string, error: string) => void;
    }
  ): void {
    // Arrêter toute progression existante pour cette image
    this.stopImageProgress(imageId);

    // Créer un nouveau gestionnaire
    const manager = new ImageProgressManager(imageId);
    this.progressManagers.set(imageId, manager);

    // Démarrer la progression
    manager.startProgress(config, callbacks);
  }

  /**
   * Met à jour la configuration pour une image en cours
   */
  updateImageProgress(imageId: string, newConfig: Partial<ProgressConfigType>): void {
    const manager = this.progressManagers.get(imageId);
    manager?.updateEstimation(newConfig);
  }

  /**
   * Force la complétion d'une progression
   */
  completeImageProgress(imageId: string): void {
    const manager = this.progressManagers.get(imageId);
    if (manager) {
      manager.complete();
      this.progressManagers.delete(imageId);
    }
  }

  /**
   * Signale une erreur pour une progression
   */
  errorImageProgress(imageId: string, error: string): void {
    const manager = this.progressManagers.get(imageId);
    if (manager) {
      manager.error(error);
      this.progressManagers.delete(imageId);
    }
  }

  /**
   * Arrête la progression pour une image
   */
  stopImageProgress(imageId: string): void {
    const manager = this.progressManagers.get(imageId);
    if (manager) {
      manager.stop();
      this.progressManagers.delete(imageId);
    }
  }

  /**
   * Obtient l'état actuel d'une progression
   */
  getImageProgressState(imageId: string) {
    const manager = this.progressManagers.get(imageId);
    return manager?.getCurrentState() ?? null;
  }

  /**
   * Arrête toutes les progressions en cours
   */
  stopAllProgress(): void {
    for (const manager of this.progressManagers.values()) {
      manager.stop();
    }
    this.progressManagers.clear();
  }

  /**
   * Obtient la liste des progressions actives
   */
  getActiveProgressions(): string[] {
    return Array.from(this.progressManagers.keys());
  }

  /**
   * Crée une estimation rapide basée sur les paramètres d'image
   */
  createQuickEstimation(
    inputFormat: string,
    outputFormat: string,
    fileSize: number,
    quality: number = 80
  ): ProgressEstimationRequestType {
    return {
      input_format: inputFormat.toLowerCase(),
      output_format: outputFormat.toLowerCase(),
      original_size: fileSize,
      quality_setting: quality,
      lossy_mode: quality < 90, // Heuristique simple
    };
  }

  /**
   * Pipeline complet : estimation + démarrage de progression
   */
  async startSmartProgress(
    imageId: string,
    inputFormat: string,
    outputFormat: string,
    fileSize: number,
    quality: number,
    callbacks: {
      onProgress?: (imageId: string, progress: number) => void;
      onComplete?: (imageId: string) => void;
      onError?: (imageId: string, error: string) => void;
    }
  ): Promise<void> {
    try {
      // 1. Créer la requête d'estimation
      const estimationRequest = this.createQuickEstimation(
        inputFormat,
        outputFormat,
        fileSize,
        quality
      );

      // 2. Obtenir l'estimation du backend
      const estimation = await this.getProgressEstimation(estimationRequest);

      console.log(
        `🎯 Smart progress for ${imageId}: ${estimation.estimated_duration_ms}ms (confidence: ${estimation.confidence})`
      );

      // 3. Démarrer la progression avec la configuration estimée
      this.startImageProgress(imageId, estimation.progress_config, callbacks);
    } catch (error) {
      console.error('Failed to start smart progress:', error);
      // Fallback : progression avec valeurs par défaut
      const fallbackConfig: ProgressConfigType = {
        estimated_duration_ms: 1000,
        update_interval_ms: 50,
        easing_function: 'ease_out',
        completion_threshold: 95,
      };

      this.startImageProgress(imageId, fallbackConfig, callbacks);
    }
  }
}

// Instance singleton du service
export const progressService = new ProgressService();

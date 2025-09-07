import { ProgressConfigType, ProgressStateType } from './schema';

/**
 * Calculateur de progression smooth avec easing
 * Implémente l'approche V1 : estimation simple + animation fluide
 */
export class SmoothProgressCalculator {
  private config: ProgressConfigType;
  private startTime: number | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onProgressUpdate?: (progress: number) => void;
  private onComplete?: () => void;

  constructor(config: ProgressConfigType) {
    this.config = config;
  }

  /**
   * Démarre l'animation de progression
   */
  start(onProgressUpdate: (progress: number) => void, onComplete?: () => void): void {
    this.onProgressUpdate = onProgressUpdate;
    this.onComplete = onComplete;
    this.startTime = Date.now();

    // Commencer immédiatement à 0%
    onProgressUpdate(0);

    // Démarrer les updates réguliers
    this.intervalId = setInterval(() => {
      const currentProgress = this.calculateCurrentProgress();

      if (onProgressUpdate) {
        onProgressUpdate(currentProgress);
      }

      // Arrêter les updates automatiques si on atteint le seuil
      if (currentProgress >= this.config.completion_threshold) {
        this.pauseAnimation();
      }
    }, this.config.update_interval_ms);
  }

  /**
   * Met à jour la configuration (par ex. si on reçoit une meilleure estimation)
   */
  updateConfig(newConfig: Partial<ProgressConfigType>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Force la complétion à 100%
   */
  complete(): void {
    this.stop();
    if (this.onProgressUpdate) {
      this.onProgressUpdate(100);
    }
    if (this.onComplete) {
      this.onComplete();
    }
  }

  /**
   * Arrête complètement l'animation
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Met en pause l'animation automatique (mais garde l'état)
   */
  private pauseAnimation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Calcule le pourcentage de progression actuel
   */
  private calculateCurrentProgress(): number {
    if (!this.startTime) return 0;

    const elapsedMs = Date.now() - this.startTime;
    const progressRatio = Math.min(elapsedMs / this.config.estimated_duration_ms, 1);

    // Appliquer la fonction d'easing
    const easedRatio = this.applyEasing(progressRatio);

    // Limiter au seuil de complétion
    const maxProgress = this.config.completion_threshold;
    return Math.min(easedRatio * maxProgress, maxProgress);
  }

  /**
   * Applique la fonction d'easing configurée
   */
  private applyEasing(ratio: number): number {
    switch (this.config.easing_function) {
      case 'linear':
        return ratio;

      case 'ease_out':
        // Cubic ease-out: plus rapide au début, ralentit vers la fin
        return 1 - Math.pow(1 - ratio, 3);

      case 'bezier':
        // Approximation d'une courbe de Bézier (quadratic ease-out)
        return 1 - Math.pow(1 - ratio, 2);

      default:
        return ratio;
    }
  }

  /**
   * Obtient l'état actuel de la progression
   */
  getCurrentState(): ProgressStateType {
    const now = Date.now();
    const elapsedMs = this.startTime ? now - this.startTime : 0;
    const currentProgress = this.startTime ? this.calculateCurrentProgress() : 0;

    // Estimation du temps restant basée sur la progression actuelle
    const estimatedRemainingMs =
      this.startTime && currentProgress > 0
        ? Math.max(0, this.config.estimated_duration_ms - elapsedMs)
        : this.config.estimated_duration_ms;

    return {
      progress_percent: currentProgress,
      is_active: this.intervalId !== null,
      start_time: this.startTime ?? undefined,
      elapsed_ms: elapsedMs,
      estimated_remaining_ms: estimatedRemainingMs,
    };
  }
}

/**
 * Gestionnaire de progression pour une image spécifique
 */
export class ImageProgressManager {
  private imageId: string;
  private calculator: SmoothProgressCalculator | null = null;
  private callbacks: {
    onProgress?: (imageId: string, progress: number) => void;
    onComplete?: (imageId: string) => void;
    onError?: (imageId: string, error: string) => void;
  } = {};

  constructor(imageId: string) {
    this.imageId = imageId;
  }

  /**
   * Démarre la progression pour cette image
   */
  startProgress(
    config: ProgressConfigType,
    callbacks: {
      onProgress?: (imageId: string, progress: number) => void;
      onComplete?: (imageId: string) => void;
      onError?: (imageId: string, error: string) => void;
    }
  ): void {
    this.callbacks = callbacks;
    this.calculator = new SmoothProgressCalculator(config);

    this.calculator.start(
      progress => {
        if (this.callbacks.onProgress) {
          this.callbacks.onProgress(this.imageId, progress);
        }
      },
      () => {
        if (this.callbacks.onComplete) {
          this.callbacks.onComplete(this.imageId);
        }
      }
    );
  }

  /**
   * Met à jour la configuration de progression (si on reçoit une meilleure estimation)
   */
  updateEstimation(newConfig: Partial<ProgressConfigType>): void {
    this.calculator?.updateConfig(newConfig);
  }

  /**
   * Force la complétion
   */
  complete(): void {
    this.calculator?.complete();
  }

  /**
   * Signale une erreur
   */
  error(message: string): void {
    this.calculator?.stop();
    if (this.callbacks.onError) {
      this.callbacks.onError(this.imageId, message);
    }
  }

  /**
   * Arrête la progression
   */
  stop(): void {
    this.calculator?.stop();
  }

  /**
   * Obtient l'état actuel
   */
  getCurrentState(): ProgressStateType {
    return (
      this.calculator?.getCurrentState() ?? {
        progress_percent: 0,
        is_active: false,
      }
    );
  }

  /**
   * Sérialise vers un objet plain pour l'UI
   */
  toJSON() {
    return {
      imageId: this.imageId,
      state: this.getCurrentState(),
    };
  }
}

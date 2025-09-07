/**
 * Système de progression adaptative qui se synchronise avec la compression réelle
 *
 * Phases :
 * 1. (0-70%) : Progression fluide basée sur l'estimation
 * 2. (70-90%) : Ralentissement et attente de signaux
 * 3. (90-100%) : Accélération finale à la complétion
 */

export class AdaptiveProgressManager {
  private imageId: string;
  private config: {
    estimatedDurationMs: number;
    updateIntervalMs: number;
    phases: Record<
      'smooth' | 'waiting' | 'final' | 'completed',
      { start: number; end: number; speed: number }
    >;
  };

  private startTime: number = 0;
  private currentPhase: 'smooth' | 'waiting' | 'final' | 'completed' = 'smooth';
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastProgress: number = 0;
  private compressionStarted: boolean = false;
  private compressionCompleted: boolean = false;

  private callbacks: {
    onProgress?: (imageId: string, progress: number) => void;
    onComplete?: (imageId: string) => void;
    onError?: (imageId: string, error: string) => void;
  } = {};

  constructor(imageId: string, estimatedDurationMs: number) {
    this.imageId = imageId;
    this.config = {
      estimatedDurationMs,
      updateIntervalMs: 50, // 20fps fluide
      phases: {
        smooth: { start: 0, end: 70, speed: 1.0 },
        waiting: { start: 70, end: 90, speed: 0.3 }, // 70% plus lent
        final: { start: 90, end: 100, speed: 3.0 }, // 3x plus rapide
        completed: { start: 100, end: 100, speed: 0 },
      },
    };
  }

  start(callbacks: typeof this.callbacks): void {
    this.callbacks = callbacks;
    this.startTime = Date.now();
    this.currentPhase = 'smooth';
    this.lastProgress = 0;

    console.log(
      `🚀 AdaptiveProgress started for ${this.imageId} (estimated: ${this.config.estimatedDurationMs}ms)`
    );

    // Démarrer immédiatement à 0%
    this.updateProgress(0);

    // Lancer la progression automatique
    this.intervalId = setInterval(() => {
      this.tick();
    }, this.config.updateIntervalMs);
  }

  /**
   * Signal que la compression réelle a commencé
   * Permet d'ajuster la progression si on est en retard/avance
   */
  onCompressionStarted(): void {
    this.compressionStarted = true;
    const elapsed = Date.now() - this.startTime;
    console.log(
      `🎬 Compression started for ${this.imageId} at ${elapsed}ms (progress: ${this.lastProgress}%)`
    );

    // Si on est déjà dans la phase waiting, on peut accélérer un peu
    if (this.currentPhase === 'waiting' && this.lastProgress < 85) {
      this.currentPhase = 'smooth';
      console.log(`⚡ Switching back to smooth phase`);
    }
  }

  /**
   * Signal que la compression est terminée
   * Déclenche la phase finale pour aller à 100%
   */
  onCompressionCompleted(): void {
    this.compressionCompleted = true;
    this.currentPhase = 'final';
    console.log(`✅ Compression completed for ${this.imageId}, entering final phase`);
  }

  /**
   * Force la complétion immédiate
   */
  complete(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.currentPhase = 'completed';
    this.updateProgress(100);
    this.callbacks.onComplete?.(this.imageId);
    console.log(`🏁 Progress completed for ${this.imageId}`);
  }

  /**
   * Signal une erreur
   */
  error(error: string): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.callbacks.onError?.(this.imageId, error);
    console.log(`❌ Progress error for ${this.imageId}: ${error}`);
  }

  /**
   * Arrête la progression
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log(`⏹️ Progress stopped for ${this.imageId}`);
  }

  private tick(): void {
    if (this.currentPhase === 'completed') {
      return;
    }

    const elapsed = Date.now() - this.startTime;
    let newProgress = this.calculateProgress(elapsed);

    // Assurer la progression monotone
    if (newProgress <= this.lastProgress) {
      newProgress = this.lastProgress + 0.5; // Minimum 0.5% par tick
    }

    // Déterminer la phase selon la progression
    this.updatePhase(newProgress);

    // Si compression terminée et on n'est pas en phase finale, y aller
    if (this.compressionCompleted && this.currentPhase !== 'final') {
      this.currentPhase = 'final';
    }

    this.updateProgress(Math.min(newProgress, 100));

    // Auto-complétion si on atteint 100%
    if (newProgress >= 100) {
      this.complete();
    }
  }

  private calculateProgress(elapsedMs: number): number {
    const phase = this.config.phases[this.currentPhase];
    if (!phase) return this.lastProgress;

    // Progression basée sur le temps avec vitesse de phase
    const progressRatio = (elapsedMs / this.config.estimatedDurationMs) * phase.speed;
    const baseProgress = Math.min(progressRatio * 100, 100);

    // Borner selon la phase
    return Math.min(Math.max(baseProgress, phase.start), phase.end);
  }

  private updatePhase(progress: number): void {
    const oldPhase = this.currentPhase;

    if (progress < 70) {
      this.currentPhase = 'smooth';
    } else if (progress < 90 && !this.compressionCompleted) {
      this.currentPhase = 'waiting';
    } else {
      this.currentPhase = 'final';
    }

    if (oldPhase !== this.currentPhase) {
      console.log(
        `🔄 Phase change for ${this.imageId}: ${oldPhase} → ${this.currentPhase} (${progress}%)`
      );
    }
  }

  private updateProgress(progress: number): void {
    this.lastProgress = progress;
    this.callbacks.onProgress?.(this.imageId, Math.floor(progress));
  }

  /**
   * Obtient l'état actuel
   */
  getCurrentState() {
    return {
      imageId: this.imageId,
      progress: this.lastProgress,
      phase: this.currentPhase,
      elapsed: Date.now() - this.startTime,
      compressionStarted: this.compressionStarted,
      compressionCompleted: this.compressionCompleted,
    };
  }
}

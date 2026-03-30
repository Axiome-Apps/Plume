/**
 * Adaptive progress manager — smooth UX loader synchronized with real compression.
 *
 * Strategy:
 * 1. (0→85%) Smooth progression based on estimated duration from DB
 * 2. (85%)   Hold and wait for the real completion signal
 * 3. (85→100%) Quick ease-out animation once compression is confirmed done
 *
 * The estimated duration improves over time as real compression_time_ms
 * accumulates in the SQLite database.
 */

const MAX_WAITING_PROGRESS = 85;
const COMPLETION_ANIMATION_MS = 350;
const UPDATE_INTERVAL_MS = 50;

export class AdaptiveProgressManager {
  private imageId: string;
  private estimatedDurationMs: number;

  private startTime: number = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastProgress: number = 0;
  private compressionDone: boolean = false;
  private completionStartTime: number | null = null;

  private callbacks: {
    onProgress?: (imageId: string, progress: number) => void;
    onComplete?: (imageId: string) => void;
    onError?: (imageId: string, error: string) => void;
  } = {};

  constructor(imageId: string, estimatedDurationMs: number) {
    this.imageId = imageId;
    this.estimatedDurationMs = Math.max(estimatedDurationMs, 500);
  }

  start(callbacks: typeof this.callbacks): void {
    this.callbacks = callbacks;
    this.startTime = Date.now();
    this.lastProgress = 0;
    this.compressionDone = false;
    this.completionStartTime = null;

    this.updateProgress(0);

    this.intervalId = setInterval(() => {
      this.tick();
    }, UPDATE_INTERVAL_MS);
  }

  onCompressionStarted(): void {
    // No-op — kept for API compatibility with the store
  }

  onCompressionCompleted(): void {
    this.compressionDone = true;
    this.completionStartTime = Date.now();
  }

  complete(): void {
    this.stopInterval();
    this.updateProgress(100);
    this.callbacks.onComplete?.(this.imageId);
  }

  error(errorMsg: string): void {
    this.stopInterval();
    this.callbacks.onError?.(this.imageId, errorMsg);
  }

  stop(): void {
    this.stopInterval();
  }

  getCurrentState() {
    return {
      imageId: this.imageId,
      progress: this.lastProgress,
      elapsed: Date.now() - this.startTime,
      compressionDone: this.compressionDone,
    };
  }

  private tick(): void {
    if (this.compressionDone && this.completionStartTime) {
      this.tickCompletion();
    } else {
      this.tickSmooth();
    }
  }

  /**
   * Phase 1: smooth progression up to MAX_WAITING_PROGRESS (85%)
   * Uses an ease-out curve so it starts fast and decelerates naturally.
   */
  private tickSmooth(): void {
    const elapsed = Date.now() - this.startTime;
    const ratio = Math.min(elapsed / this.estimatedDurationMs, 1);

    // Ease-out: fast start, slow approach to cap
    const eased = 1 - Math.pow(1 - ratio, 2);
    const progress = eased * MAX_WAITING_PROGRESS;

    // Never go backwards, but don't force +0.5 either — just hold
    if (progress > this.lastProgress) {
      this.updateProgress(progress);
    }
  }

  /**
   * Phase 2: compression is done — animate 85→100% over COMPLETION_ANIMATION_MS
   */
  private tickCompletion(): void {
    const elapsed = Date.now() - this.completionStartTime!;
    const ratio = Math.min(elapsed / COMPLETION_ANIMATION_MS, 1);

    // Ease-out for the final stretch
    const eased = 1 - Math.pow(1 - ratio, 3);
    const progress = this.lastProgress + (100 - this.lastProgress) * eased;

    this.updateProgress(progress);

    if (ratio >= 1) {
      this.complete();
    }
  }

  private updateProgress(progress: number): void {
    const clamped = Math.min(Math.floor(progress), 100);
    if (clamped !== this.lastProgress) {
      this.lastProgress = clamped;
      this.callbacks.onProgress?.(this.imageId, clamped);
    }
  }

  private stopInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

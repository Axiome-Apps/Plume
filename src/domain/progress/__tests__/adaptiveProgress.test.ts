import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdaptiveProgressManager } from '../adaptiveProgress';

const MAX_WAITING_PROGRESS = 85;
const COMPLETION_ANIMATION_MS = 350;

function lastProgressOf(onProgress: ReturnType<typeof vi.fn>): number {
  const calls = onProgress.mock.calls;
  const lastCall = calls[calls.length - 1];
  if (!lastCall) throw new Error('onProgress was never called');
  return lastCall[1];
}

describe('AdaptiveProgressManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('waiting phase', () => {
    it('progresses without ever going backwards', () => {
      const onProgress = vi.fn();
      const manager = new AdaptiveProgressManager('img-1', 1000);
      manager.start({ onProgress });

      vi.advanceTimersByTime(1000);

      const values = onProgress.mock.calls.map(([, progress]) => progress);
      expect(values.length).toBeGreaterThan(0);
      expect(values).toEqual([...values].sort((a, b) => a - b));
      expect(values.every((progress: number) => progress <= MAX_WAITING_PROGRESS)).toBe(true);
    });

    it('holds at 85% once the estimated duration is spent', () => {
      const onProgress = vi.fn();
      const manager = new AdaptiveProgressManager('img-1', 1000);
      manager.start({ onProgress });

      vi.advanceTimersByTime(1000);
      expect(lastProgressOf(onProgress)).toBe(MAX_WAITING_PROGRESS);

      const callsAtCap = onProgress.mock.calls.length;
      vi.advanceTimersByTime(5000);

      expect(onProgress.mock.calls.length).toBe(callsAtCap);
    });

    it('eases out — the first half of the wait covers more than half the bar', () => {
      const onProgress = vi.fn();
      const manager = new AdaptiveProgressManager('img-1', 1000);
      manager.start({ onProgress });

      vi.advanceTimersByTime(500);

      expect(lastProgressOf(onProgress)).toBeGreaterThan(MAX_WAITING_PROGRESS / 2);
    });

    it('floors a very short estimate at 500 ms so the bar stays readable', () => {
      const onProgress = vi.fn();
      const manager = new AdaptiveProgressManager('img-1', 10);
      manager.start({ onProgress });

      vi.advanceTimersByTime(250);
      expect(lastProgressOf(onProgress)).toBeLessThan(MAX_WAITING_PROGRESS);

      vi.advanceTimersByTime(250);
      expect(lastProgressOf(onProgress)).toBe(MAX_WAITING_PROGRESS);
    });

    it('never announces completion on its own', () => {
      const onComplete = vi.fn();
      const manager = new AdaptiveProgressManager('img-1', 1000);
      manager.start({ onProgress: vi.fn(), onComplete });

      vi.advanceTimersByTime(60_000);

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('completion phase', () => {
    it('animates to 100% and reports completion once the backend confirms', () => {
      const onProgress = vi.fn();
      const onComplete = vi.fn();
      const manager = new AdaptiveProgressManager('img-1', 1000);
      manager.start({ onProgress, onComplete });

      vi.advanceTimersByTime(1000);
      manager.onCompressionCompleted();

      expect(onComplete).not.toHaveBeenCalled();

      vi.advanceTimersByTime(COMPLETION_ANIMATION_MS);

      expect(lastProgressOf(onProgress)).toBe(100);
      expect(onComplete).toHaveBeenCalledExactlyOnceWith('img-1');
    });

    it('reaches 100% even when the backend answers before the bar filled', () => {
      const onProgress = vi.fn();
      const onComplete = vi.fn();
      const manager = new AdaptiveProgressManager('img-1', 10_000);
      manager.start({ onProgress, onComplete });

      vi.advanceTimersByTime(200);
      expect(lastProgressOf(onProgress)).toBeLessThan(MAX_WAITING_PROGRESS);

      manager.onCompressionCompleted();
      vi.advanceTimersByTime(COMPLETION_ANIMATION_MS);

      expect(lastProgressOf(onProgress)).toBe(100);
      expect(onComplete).toHaveBeenCalledOnce();
    });

    it('stops ticking once complete', () => {
      const onProgress = vi.fn();
      const onComplete = vi.fn();
      const manager = new AdaptiveProgressManager('img-1', 1000);
      manager.start({ onProgress, onComplete });

      manager.onCompressionCompleted();
      vi.advanceTimersByTime(COMPLETION_ANIMATION_MS + 5000);

      expect(onComplete).toHaveBeenCalledOnce();
    });
  });

  describe('teardown', () => {
    it('stop() clears the interval and leaves the progress where it was', () => {
      const onProgress = vi.fn();
      const manager = new AdaptiveProgressManager('img-1', 1000);
      manager.start({ onProgress });

      vi.advanceTimersByTime(200);
      const frozen = lastProgressOf(onProgress);
      manager.stop();

      vi.advanceTimersByTime(5000);

      expect(lastProgressOf(onProgress)).toBe(frozen);
      expect(manager.getCurrentState().progress).toBe(frozen);
    });

    it('error() reports the failure and stops the animation', () => {
      const onProgress = vi.fn();
      const onError = vi.fn();
      const manager = new AdaptiveProgressManager('img-1', 1000);
      manager.start({ onProgress, onError });

      vi.advanceTimersByTime(200);
      const callsBeforeError = onProgress.mock.calls.length;
      manager.error('boom');

      vi.advanceTimersByTime(5000);

      expect(onError).toHaveBeenCalledExactlyOnceWith('img-1', 'boom');
      expect(onProgress.mock.calls.length).toBe(callsBeforeError);
    });
  });

  describe('getCurrentState', () => {
    it('exposes the identity, the progress and the elapsed time', () => {
      const manager = new AdaptiveProgressManager('img-42', 1000);
      manager.start({ onProgress: vi.fn() });

      vi.advanceTimersByTime(500);
      manager.onCompressionCompleted();

      const state = manager.getCurrentState();
      expect(state.imageId).toBe('img-42');
      expect(state.elapsed).toBe(500);
      expect(state.compressionDone).toBe(true);
      expect(state.progress).toBeGreaterThan(0);
    });
  });
});

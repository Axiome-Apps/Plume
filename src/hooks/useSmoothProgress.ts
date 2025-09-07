import { useState, useCallback, useRef, useEffect } from 'react';
import { progressService, ProgressConfigType } from '@/domain/progress';

interface UseProgressOptions {
  onComplete?: (imageId: string) => void;
  onError?: (imageId: string, error: string) => void;
}

interface ProgressState {
  [imageId: string]: {
    progress: number;
    isActive: boolean;
    startTime?: number;
    elapsedMs?: number;
    estimatedRemainingMs?: number;
  };
}

/**
 * Hook pour gérer la progression smooth des compressions d'images
 * Utilise le système de progression V1 avec animation fluide
 */
export function useSmoothProgress(options: UseProgressOptions = {}) {
  const [progressStates, setProgressStates] = useState<ProgressState>({});
  const activeProgressionsRef = useRef(new Set<string>());

  // Callback pour les mises à jour de progression
  const handleProgressUpdate = useCallback((imageId: string, progress: number) => {
    setProgressStates(prev => ({
      ...prev,
      [imageId]: {
        ...prev[imageId],
        progress: Math.round(progress * 100) / 100, // Arrondir à 2 décimales
        isActive: true,
      },
    }));
  }, []);

  // Callback pour la complétion
  const handleComplete = useCallback(
    (imageId: string) => {
      setProgressStates(prev => ({
        ...prev,
        [imageId]: {
          ...prev[imageId],
          progress: 100,
          isActive: false,
        },
      }));
      activeProgressionsRef.current.delete(imageId);
      options.onComplete?.(imageId);
    },
    [options]
  );

  // Callback pour les erreurs
  const handleError = useCallback(
    (imageId: string, error: string) => {
      setProgressStates(prev => ({
        ...prev,
        [imageId]: {
          ...prev[imageId],
          isActive: false,
        },
      }));
      activeProgressionsRef.current.delete(imageId);
      options.onError?.(imageId, error);
    },
    [options]
  );

  /**
   * Démarre la progression intelligente pour une image
   */
  const startProgress = useCallback(
    async (
      imageId: string,
      inputFormat: string,
      outputFormat: string,
      fileSize: number,
      quality: number = 80
    ) => {
      console.log(`🎯 Starting smooth progress for ${imageId}`);

      // Marquer comme actif
      activeProgressionsRef.current.add(imageId);

      // Initialiser l'état
      setProgressStates(prev => ({
        ...prev,
        [imageId]: {
          progress: 0,
          isActive: true,
          startTime: Date.now(),
        },
      }));

      // Démarrer la progression intelligente
      await progressService.startSmartProgress(
        imageId,
        inputFormat,
        outputFormat,
        fileSize,
        quality,
        {
          onProgress: handleProgressUpdate,
          onComplete: handleComplete,
          onError: handleError,
        }
      );
    },
    [handleProgressUpdate, handleComplete, handleError]
  );

  /**
   * Force la complétion d'une progression
   */
  const completeProgress = useCallback(
    (imageId: string) => {
      progressService.completeImageProgress(imageId);
      handleComplete(imageId);
    },
    [handleComplete]
  );

  /**
   * Signale une erreur pour une progression
   */
  const errorProgress = useCallback(
    (imageId: string, error: string) => {
      progressService.errorImageProgress(imageId, error);
      handleError(imageId, error);
    },
    [handleError]
  );

  /**
   * Arrête une progression spécifique
   */
  const stopProgress = useCallback((imageId: string) => {
    progressService.stopImageProgress(imageId);
    activeProgressionsRef.current.delete(imageId);

    setProgressStates(prev => ({
      ...prev,
      [imageId]: {
        ...prev[imageId],
        isActive: false,
      },
    }));
  }, []);

  /**
   * Arrête toutes les progressions
   */
  const stopAllProgress = useCallback(() => {
    progressService.stopAllProgress();
    activeProgressionsRef.current.clear();

    setProgressStates(prev => {
      const updated = { ...prev };
      for (const imageId in updated) {
        updated[imageId] = {
          ...updated[imageId],
          isActive: false,
        };
      }
      return updated;
    });
  }, []);

  /**
   * Met à jour la configuration d'une progression en cours
   */
  const updateProgressConfig = useCallback(
    (imageId: string, config: Partial<ProgressConfigType>) => {
      progressService.updateImageProgress(imageId, config);
    },
    []
  );

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      stopAllProgress();
    };
  }, [stopAllProgress]);

  return {
    // État
    progressStates,
    activeProgressions: Array.from(activeProgressionsRef.current),

    // Actions
    startProgress,
    completeProgress,
    errorProgress,
    stopProgress,
    stopAllProgress,
    updateProgressConfig,

    // Utilitaires
    getProgress: (imageId: string) => progressStates[imageId]?.progress ?? 0,
    isActive: (imageId: string) => progressStates[imageId]?.isActive ?? false,
    hasProgress: (imageId: string) => imageId in progressStates,
  };
}

/**
 * Hook simplifié pour une seule image
 */
export function useSingleProgress(imageId: string, options: UseProgressOptions = {}) {
  const {
    progressStates,
    startProgress,
    completeProgress,
    errorProgress,
    stopProgress,
    updateProgressConfig,
  } = useSmoothProgress(options);

  const progress = progressStates[imageId]?.progress ?? 0;
  const isActive = progressStates[imageId]?.isActive ?? false;

  const start = useCallback(
    (inputFormat: string, outputFormat: string, fileSize: number, quality?: number) => {
      return startProgress(imageId, inputFormat, outputFormat, fileSize, quality);
    },
    [imageId, startProgress]
  );

  const complete = useCallback(() => {
    completeProgress(imageId);
  }, [imageId, completeProgress]);

  const error = useCallback(
    (errorMessage: string) => {
      errorProgress(imageId, errorMessage);
    },
    [imageId, errorProgress]
  );

  const stop = useCallback(() => {
    stopProgress(imageId);
  }, [imageId, stopProgress]);

  const updateConfig = useCallback(
    (config: Partial<ProgressConfigType>) => {
      updateProgressConfig(imageId, config);
    },
    [imageId, updateProgressConfig]
  );

  return {
    progress,
    isActive,
    start,
    complete,
    error,
    stop,
    updateConfig,
  };
}

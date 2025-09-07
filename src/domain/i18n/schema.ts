import { z } from 'zod';

/**
 * Schema de validation pour les clés de traduction
 * Définit la structure type-safe des traductions (imbriquée)
 */
export const TranslationKeysSchema = z.object({
  app: z.object({
    name: z.string(),
    description: z.string(),
  }),
  header: z.object({
    title: z.object({
      pending: z.string(),
      processing: z.string(),
      completed: z.string(),
    }),
    recommended: z.string(),
    tooltips: z.object({
      format: z.object({
        title: z.string(),
        description: z.string(),
        info: z.string(),
      }),
      strategy: z.object({
        title: z.string(),
        description: z.string(),
        info: z.string(),
      }),
    }),
    empty: z.string(),
    downloadAll: z.string(),
    totalSize: z.string(),
    compression: z.object({
      pending: z.string(),
      active: z.string(),
      completed: z.string(),
    }),
  }),
  common: z.object({
    cancel: z.string(),
    confirm: z.string(),
    save: z.string(),
    download: z.string(),
    delete: z.string(),
    loading: z.string(),
    error: z.string(),
    success: z.string(),
    supported: z.string(),
    browse: z.string(),
  }),
  compression: z.object({
    start: z.string(),
    selectFiles: z.string(),
    dropFiles: z.string(),
    pending: z.string(),
    processing: z.string(),
    progress: z.string(),
    completed: z.string(),
    failed: z.string(),
    error: z.string(),
  }),
  formats: z.object({
    png: z.string(),
    jpeg: z.string(),
    webp: z.string(),
    auto: z.string(),
  }),
  errors: z.object({
    fileTooBig: z.string(),
    invalidFormat: z.string(),
    compressionFailed: z.string(),
    networkError: z.string(),
  }),
  stats: z.object({
    originalSize: z.string(),
    compressedSize: z.string(),
    reduction: z.string(),
    savings: z.string(),
    finalSize: z.string(),
    economy: z.string(),
    estimation: z.string(),
  }),
  settings: z.object({
    quality: z.string(),
    format: z.string(),
    outputPath: z.string(),
    advanced: z.string(),
  }),
  success: z.object({
    title: z.string(),
    description: z.string(),
    download: z.string(),
    startOver: z.string(),
  }),
});

export type TranslationKeysType = z.infer<typeof TranslationKeysSchema>;

// Type pour les clés imbriquées (ex: 'app.title', 'common.cancel')
export type TranslationKeyType =
  | `app.${keyof TranslationKeysType['app']}`
  | `header.${keyof TranslationKeysType['header']}`
  | `header.title.${keyof TranslationKeysType['header']['title']}`
  | `header.compression.${keyof TranslationKeysType['header']['compression']}`
  | `header.tooltips.format.${keyof TranslationKeysType['header']['tooltips']['format']}`
  | `header.tooltips.strategy.${keyof TranslationKeysType['header']['tooltips']['strategy']}`
  | `common.${keyof TranslationKeysType['common']}`
  | `compression.${keyof TranslationKeysType['compression']}`
  | `formats.${keyof TranslationKeysType['formats']}`
  | `errors.${keyof TranslationKeysType['errors']}`
  | `stats.${keyof TranslationKeysType['stats']}`
  | `settings.${keyof TranslationKeysType['settings']}`
  | `success.${keyof TranslationKeysType['success']}`;

/**
 * Fonction de validation des fichiers de traduction
 */
export function validateTranslations(translations: unknown): TranslationKeysType {
  return TranslationKeysSchema.parse(translations);
}

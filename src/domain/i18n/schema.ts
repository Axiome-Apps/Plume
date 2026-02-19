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
    controls: z.object({
      format: z.object({
        title: z.string(),
        keep: z.string(),
        tooltip: z.string(),
      }),
      level: z.object({
        title: z.string(),
        light: z.string(),
        balanced: z.string(),
        aggressive: z.string(),
        tooltip: z.string(),
        pngLocked: z.string(),
        pngHeicWarning: z.string(),
      }),
    }),
    empty: z.string(),
    downloadAll: z.string(),
    totalSize: z.string(),
    compression: z.object({
      pending: z.string(),
      active: z.string(),
    }),
  }),
  common: z.object({
    download: z.string(),
    supported: z.string(),
    browse: z.string(),
  }),
  compression: z.object({
    selectFiles: z.string(),
    pending: z.string(),
    processing: z.string(),
    completed: z.string(),
    error: z.string(),
  }),
  stats: z.object({
    finalSize: z.string(),
    economy: z.string(),
    estimation: z.string(),
  }),
  success: z.object({
    title: z.string(),
    description: z.string(),
    download: z.string(),
    startOver: z.string(),
  }),
});

export type TranslationKeysType = z.infer<typeof TranslationKeysSchema>;

// Type pour les clés imbriquées (ex: 'app.name', 'common.download')
export type TranslationKeyType =
  | `app.${keyof TranslationKeysType['app']}`
  | `header.${keyof TranslationKeysType['header']}`
  | `header.title.${keyof TranslationKeysType['header']['title']}`
  | `header.compression.${keyof TranslationKeysType['header']['compression']}`
  | `header.controls.format.${keyof TranslationKeysType['header']['controls']['format']}`
  | `header.controls.level.${keyof TranslationKeysType['header']['controls']['level']}`
  | `common.${keyof TranslationKeysType['common']}`
  | `compression.${keyof TranslationKeysType['compression']}`
  | `stats.${keyof TranslationKeysType['stats']}`
  | `success.${keyof TranslationKeysType['success']}`;

/**
 * Fonction de validation des fichiers de traduction
 */
export function validateTranslations(translations: unknown): TranslationKeysType {
  return TranslationKeysSchema.parse(translations);
}

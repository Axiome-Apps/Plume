import { z } from 'zod';

/**
 * Validation schema for translation keys.
 * Defines the type-safe (nested) translation structure.
 */
export const TranslationKeysSchema = z.object({
  app: z.object({
    name: z.string(),
    description: z.string(),
    tagline: z.string(),
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
    totalSize: z.string(),
    compression: z.object({
      pending: z.string(),
      active: z.string(),
    }),
  }),
  common: z.object({
    supported: z.string(),
    browse: z.string(),
    import: z.string(),
  }),
  compression: z.object({
    selectFiles: z.string(),
    pending: z.string(),
    processing: z.string(),
    completed: z.string(),
    error: z.string(),
  }),
  batch: z.object({
    pendingTagline_one: z.string(),
    pendingTagline_other: z.string(),
    eyebrow: z.string(),
    kpi: z.object({
      estimated: z.string(),
      realized: z.string(),
      gained: z.string(),
    }),
    imagesCount: z.string(),
    dropHintBefore: z.string(),
    dropHintAction: z.string(),
  }),
  settings: z.object({
    eyebrow: z.string(),
    format: z.string(),
    intensity: z.string(),
    cta_one: z.string(),
    cta_other: z.string(),
  }),
  actions: z.object({
    compress: z.string(),
    delete: z.string(),
    openFolder: z.string(),
  }),
  stats: z.object({
    finalSize: z.string(),
    economy: z.string(),
    estimation: z.string(),
  }),
  success: z.object({
    title: z.string(),
    description: z.string(),
    startOver: z.string(),
  }),
  units: z.object({
    B: z.string(),
    KB: z.string(),
    MB: z.string(),
    GB: z.string(),
    TB: z.string(),
  }),
  dialog: z.object({
    selectImages: z.string(),
    imagesFilter: z.string(),
  }),
  errors: z.object({
    unknown: z.string(),
    permissionDenied: z.string(),
    invalidFile: z.string(),
    unsupportedFormat: z.string(),
    readFailed: z.string(),
    writeFailed: z.string(),
    noSpace: z.string(),
    invalidPath: z.string(),
    compressionFailed: z.string(),
  }),
  toasts: z.object({
    imagesAdded_one: z.string(),
    imagesAdded_other: z.string(),
    addFailed: z.string(),
    alreadyOptimized: z.string(),
    compressionError: z.string(),
    unsupportedIgnored_one: z.string(),
    unsupportedIgnored_other: z.string(),
  }),
  estimation: z.object({
    basedOnSamples_one: z.string(),
    basedOnSamples_other: z.string(),
    referenceData: z.string(),
    fallback: z.string(),
    conversion: z.string(),
  }),
});

export type TranslationKeysType = z.infer<typeof TranslationKeysSchema>;

// Type for nested keys (e.g. 'app.name', 'common.download')
export type TranslationKeyType =
  | `app.${keyof TranslationKeysType['app']}`
  | `header.${keyof TranslationKeysType['header']}`
  | `header.title.${keyof TranslationKeysType['header']['title']}`
  | `header.compression.${keyof TranslationKeysType['header']['compression']}`
  | `header.controls.format.${keyof TranslationKeysType['header']['controls']['format']}`
  | `header.controls.level.${keyof TranslationKeysType['header']['controls']['level']}`
  | `common.${keyof TranslationKeysType['common']}`
  | `compression.${keyof TranslationKeysType['compression']}`
  | `batch.${keyof Omit<TranslationKeysType['batch'], 'kpi'>}`
  | `batch.kpi.${keyof TranslationKeysType['batch']['kpi']}`
  | 'batch.pendingTagline'
  | `settings.${keyof TranslationKeysType['settings']}`
  | 'settings.cta'
  | `actions.${keyof TranslationKeysType['actions']}`
  | `stats.${keyof TranslationKeysType['stats']}`
  | `success.${keyof TranslationKeysType['success']}`
  | `units.${keyof TranslationKeysType['units']}`
  | `dialog.${keyof TranslationKeysType['dialog']}`
  | `errors.${keyof TranslationKeysType['errors']}`
  | `toasts.${keyof TranslationKeysType['toasts']}`
  | 'toasts.imagesAdded'
  | 'toasts.unsupportedIgnored'
  | `estimation.${keyof TranslationKeysType['estimation']}`
  | 'estimation.basedOnSamples';

/**
 * Validation function for translation files.
 */
export function validateTranslations(translations: unknown): TranslationKeysType {
  return TranslationKeysSchema.parse(translations);
}

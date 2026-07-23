import i18n from 'i18next';
import type { TranslationKeyType } from './schema';

type TranslationOptions = Record<string, string | number>;

/**
 * Translate outside the React tree — stores and services.
 *
 * Safe to call at any point after initI18n(), which main.tsx runs before the
 * first render. Components should use the useTranslation hook instead, so they
 * re-render on a language change.
 */
export function translate(key: TranslationKeyType, options?: TranslationOptions): string {
  return options ? i18n.t(key, options) : i18n.t(key);
}

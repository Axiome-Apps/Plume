import { useTranslation as useI18next } from 'react-i18next';
import type { TranslationKeyType } from '@/domain/i18n/schema';

type TranslationOptions = Record<string, string | number>;

/**
 * Custom translation hook with type safety.
 * Wraps react-i18next with our domain types.
 */
export const useTranslation = () => {
  const { t, i18n } = useI18next();

  const translate = (key: TranslationKeyType, options?: TranslationOptions) => {
    return options ? t(key, options) : t(key);
  };

  return {
    t: translate,
    i18n,
    changeLanguage: (lng: 'fr' | 'en') => i18n.changeLanguage(lng),
    currentLanguage: i18n.language,
    isLoading: !i18n.isInitialized,
  };
};

export type { TranslationKeyType } from '@/domain/i18n/schema';

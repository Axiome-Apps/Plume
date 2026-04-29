import { useTranslation as useI18next } from 'react-i18next';
import type { TranslationKeyType } from '@/domain/i18n';

type TranslationOptions = Record<string, string | number>;

/**
 * Hook personnalisé pour les traductions avec type safety
 * Wrapper autour de react-i18next avec nos types domain
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

export type { TranslationKeyType } from '@/domain/i18n';

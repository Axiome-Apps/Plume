import { useTranslation as useI18next } from 'react-i18next'
import type { TranslationKeyType } from '@/domain/i18n'

/**
 * Hook personnalisé pour les traductions avec type safety
 * Wrapper autour de react-i18next avec nos types domain
 */
export const useTranslation = () => {
  const { t, i18n } = useI18next()

  // Version type-safe du `t` function
  const translate = (key: TranslationKeyType) => {
    return t(key)
  }

  return {
    t: translate,
    i18n,
    // Helpers
    changeLanguage: (lng: 'fr' | 'en') => i18n.changeLanguage(lng),
    currentLanguage: i18n.language,
    isLoading: !i18n.isInitialized,
  }
}

// Export du type pour les composants
export type { TranslationKeyType } from '@/domain/i18n'
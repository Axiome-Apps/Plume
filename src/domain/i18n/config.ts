import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { validateTranslations } from './schema'

// Import des traductions
import frTranslations from '../../locales/fr.json'
import enTranslations from '../../locales/en.json'

// Configuration i18next
export const initI18n = () => {
  // Validation des traductions avec Zod (dev seulement)
  if (import.meta.env.DEV) {
    try {
      validateTranslations(frTranslations)
      validateTranslations(enTranslations)
      console.log('✅ Translations validated successfully')
    } catch (error) {
      console.error('❌ Translation validation failed:', error)
      // En dev, continuons malgré l'erreur pour ne pas bloquer l'app
      console.warn('⚠️ Continuing despite validation errors in development')
    }
  }

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      debug: import.meta.env.DEV,
      fallbackLng: 'fr', // Français par défaut (marché national)
      
      // Langues supportées
      supportedLngs: ['fr', 'en'],
      
      // Configuration détection
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
      },

      // Resources
      resources: {
        fr: {
          translation: frTranslations,
        },
        en: {
          translation: enTranslations,
        },
      },

      // Configuration
      interpolation: {
        escapeValue: false, // React échappe déjà
      },

      // Namespace
      defaultNS: 'translation',
      
      // Key separator (pour nested objects)
      keySeparator: '.',
      
      // Pluralization
      pluralSeparator: '_',
      
      // Return key if missing (dev)
      returnNull: !import.meta.env.DEV,
    })

  return i18n
}

// Types exports pour utilisation
export type { TranslationKeysType, TranslationKeyType } from './schema'
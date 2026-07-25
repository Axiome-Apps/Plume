import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { validateTranslations } from './schema';

// Translation imports
import frTranslations from '@/locales/fr.json';
import enTranslations from '@/locales/en.json';

// Configuration i18next
export const initI18n = () => {
  // Zod validation of translations (dev only)
  if (import.meta.env.DEV) {
    try {
      validateTranslations(frTranslations);
      validateTranslations(enTranslations);
      // Translations validated
    } catch {
      // Continue despite validation errors in development
    }
  }

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      debug: false,
      fallbackLng: 'fr', // French by default (domestic market)

      // Supported languages
      supportedLngs: ['fr', 'en'],

      // Detection configuration
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
        escapeValue: false, // React already escapes
      },

      // Namespace
      defaultNS: 'translation',

      // Key separator (for nested objects)
      keySeparator: '.',

      // Pluralization
      pluralSeparator: '_',

      // Return key if missing (dev)
      returnNull: !import.meta.env.DEV,
    });

  return i18n;
};

// Type exports for consumers
export type { TranslationKeysType, TranslationKeyType } from './schema';

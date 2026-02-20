import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

const AVAILABLE_LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
] as const;

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { currentLanguage, changeLanguage } = useTranslation();

  return (
    <div className={`relative inline-block ${className}`}>
      <select
        value={currentLanguage}
        onChange={e => changeLanguage(e.target.value as 'fr' | 'en')}
        className="appearance-none bg-white border border-secondary/30 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-text/70 hover:border-secondary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none cursor-pointer"
      >
        {AVAILABLE_LANGUAGES.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>

      {/* Custom dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg
          className="w-4 h-4 text-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default LanguageSelector;

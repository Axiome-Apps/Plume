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
        className="appearance-none bg-bg border border-rule rounded-md h-9 pl-3 pr-8 text-[13px] font-medium text-fg-2 hover:border-rule-2 hover:text-fg focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-deep cursor-pointer"
      >
        {AVAILABLE_LANGUAGES.map(lang => (
          <option key={lang.code} value={lang.code} className="bg-surface text-fg">
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>

      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="w-4 h-4 text-fg-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default LanguageSelector;

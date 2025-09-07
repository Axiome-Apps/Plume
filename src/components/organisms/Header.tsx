import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSelector } from '../atoms';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const { t } = useTranslation();

  return (
    <header className={`bg-white border-b border-slate-200 shadow-sm ${className}`}>
      <div className="relative">
        {/* Language selector positioned in top-right */}
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        
        <div className="text-center py-8 px-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t('app.name')}
          </h1>
          <p className="text-slate-600 text-lg mt-2">{t('app.description')}</p>
        </div>
      </div>
    </header>
  );
};

export default Header;

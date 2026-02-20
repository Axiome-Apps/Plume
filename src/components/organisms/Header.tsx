import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSelector } from '../atoms';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const { t } = useTranslation();

  return (
    <header className={`bg-white border-b border-secondary/20 shadow-sm ${className}`}>
      <div className="flex items-center justify-between py-3 px-4">
        <h1 className="text-xl font-bold text-primary">{t('app.name')}</h1>
        <LanguageSelector />
      </div>
    </header>
  );
};

export default Header;

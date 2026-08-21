import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSelector } from './LanguageSelector';
import { Menu, Bell, User } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { t } = useTranslation();

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-md"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <h2 className="text-lg font-semibold text-gray-800">
            {t('Bem-vindo')}
          </h2>
        </div>
        
        <div className="flex items-center gap-4">
          <LanguageSelector />
          
          <button className="p-2 hover:bg-gray-100 rounded-md relative">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          
          <button className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md">
            <User className="w-5 h-5 text-gray-600" />
            <span className="hidden md:block text-sm text-gray-700">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};

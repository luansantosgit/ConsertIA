import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  LayoutDashboard, 
  MessageSquare, 
  FileText, 
  Users, 
  Package, 
  DollarSign, 
  Calendar, 
  BarChart3, 
  Settings,
  Menu,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: MessageSquare, label: 'Atendimento', path: '/atendimento' },
  { icon: FileText, label: 'Ordens de Serviço', path: '/ordens' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Package, label: 'Estoque', path: '/estoque' },
  { icon: DollarSign, label: 'Financeiro', path: '/financeiro' },
  { icon: Calendar, label: 'Agenda', path: '/agenda' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">TechCRM</h1>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span>{t(item.label)}</span>
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
};

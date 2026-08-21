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
  X,
  Wrench
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', section: 'principal' },
  { icon: MessageSquare, label: 'Atendimento', path: '/atendimento', section: 'principal' },
  { icon: FileText, label: 'Ordens de Serviço', path: '/ordens', section: 'principal' },
  { icon: Users, label: 'Clientes', path: '/clientes', section: 'principal' },
  { icon: Package, label: 'Estoque', path: '/estoque', section: 'operacao' },
  { icon: DollarSign, label: 'Financeiro', path: '/financeiro', section: 'operacao' },
  { icon: Calendar, label: 'Agenda', path: '/agenda', section: 'operacao' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios', section: 'analise' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes', section: 'analise' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  const menuSections = {
    principal: menuItems.filter(item => item.section === 'principal'),
    operacao: menuItems.filter(item => item.section === 'operacao'),
    analise: menuItems.filter(item => item.section === 'analise'),
  };

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        animate-slide-in
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100">
              <Wrench className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">ConsertIA</h1>
              <p className="text-xs text-gray-500">CRM + IA</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Menu Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Seção Principal */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
              Principal
            </p>
            <div className="space-y-1">
              {menuSections.principal.map((item) => (
                <a
                  key={item.path}
                  href={item.path}
                  className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <item.icon className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                  <span className="text-sm font-medium">{t(item.label)}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Seção Operação */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
              Operação
            </p>
            <div className="space-y-1">
              {menuSections.operacao.map((item) => (
                <a
                  key={item.path}
                  href={item.path}
                  className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <item.icon className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                  <span className="text-sm font-medium">{t(item.label)}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Seção Análise */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
              Análise
            </p>
            <div className="space-y-1">
              {menuSections.analise.map((item) => (
                <a
                  key={item.path}
                  href={item.path}
                  className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <item.icon className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                  <span className="text-sm font-medium">{t(item.label)}</span>
                </a>
              ))}
            </div>
          </div>
        </nav>

        {/* Tenant Info (rodapé da sidebar) */}
        <div className="p-4 border-t border-gray-200">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500">Tenant</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">TechAssist Ltda</p>
            <p className="text-xs text-gray-400 mt-1">Plano Profissional</p>
          </div>
        </div>
      </aside>
    </>
  );
};

import type { ComponentType } from 'react';
import {
  SolidDashboardIcon,
  SolidAtendimentoIcon,
  SolidOrdensIcon,
  SolidClientesIcon,
  SolidEstoqueIcon,
  SolidFinanceiroIcon,
  SolidAgendaIcon,
  SolidRelatoriosIcon,
  SolidAgenteIaIcon,
  SolidConfiguracoesIcon,
} from '@/components/SolidNavIcons';

export interface NavChild {
  label: string;
  path: string;
}

export interface NavItem {
  icon: ComponentType<{ size?: number; active?: boolean }>;
  label: string;
  path: string;
  perm: string;
  children?: NavChild[];
}

export const navItems: NavItem[] = [
  { icon: SolidDashboardIcon, label: 'Dashboard', path: '/', perm: 'dashboard' },
  { icon: SolidAtendimentoIcon, label: 'Atendimento', path: '/atendimento', perm: 'atendimento' },
  { icon: SolidOrdensIcon, label: 'Ordens de Serviço', path: '/ordens', perm: 'ordens' },
  { icon: SolidClientesIcon, label: 'Clientes', path: '/clientes', perm: 'clientes' },
  { icon: SolidEstoqueIcon, label: 'Estoque', path: '/estoque', perm: 'estoque' },
  {
    icon: SolidFinanceiroIcon, label: 'Financeiro', path: '/financeiro', perm: 'financeiro',
    children: [
      { label: 'Lançamentos', path: '/financeiro' },
      { label: 'Assinatura', path: '/assinatura' },
    ],
  },
  { icon: SolidAgendaIcon, label: 'Agenda', path: '/agenda', perm: 'agenda' },
  { icon: SolidRelatoriosIcon, label: 'Relatórios', path: '/relatorios', perm: 'relatorios' },
  { icon: SolidAgenteIaIcon, label: 'Agente de IA', path: '/agente-ia', perm: 'agente-ia' },
  { icon: SolidConfiguracoesIcon, label: 'Configurações', path: '/configuracoes', perm: 'configuracoes' },
];

import type { AuthUser } from '@/stores/auth.store';

// Módulos que o admin pode liberar por usuário (checkbox no cadastro).
// Configurações é exclusiva de admin.
export type ModuleKey =
  | 'dashboard'
  | 'atendimento' | 'ordens' | 'clientes' | 'estoque'
  | 'financeiro' | 'agenda' | 'relatorios' | 'agente-ia';

export const ASSIGNABLE_MODULES: { key: ModuleKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'atendimento', label: 'Atendimento' },
  { key: 'ordens', label: 'Ordens de Serviço' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'agente-ia', label: 'Agente de IA' },
];

export function canAccess(
  user: Pick<AuthUser, 'role' | 'permissions'> | null,
  key: string,
): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'superadmin') return true;
  if (key === 'configuracoes') return false;
  // Sessão persistida antes da feature: não bloqueia até o próximo login
  if (!Array.isArray(user.permissions)) return true;
  return user.permissions.includes(key);
}

// Rota inicial válida para o usuário: dashboard ou o primeiro módulo
// liberado. Retorna null se nenhum módulo foi atribuído.
export function firstAllowedPath(
  user: Pick<AuthUser, 'role' | 'permissions'> | null,
): string | null {
  if (!user) return null;
  if (user.role === 'admin' || user.role === 'superadmin') return '/';
  if (!Array.isArray(user.permissions)) return '/';
  if (user.permissions.includes('dashboard')) return '/';
  const mod = ASSIGNABLE_MODULES.find(m => user.permissions?.includes(m.key));
  return mod ? `/${mod.key}` : null;
}

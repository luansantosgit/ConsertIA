// Tipos compartilhados da tela de empresas do SuperAdmin

export interface DbTenant {
  id: string;
  name: string;
  slug: string;
  plan_id: string;
  active: boolean;
  created_at: string;
  theme_color?: string;
  admin_email?: string;
  subscription_due_date?: string | null;
  subscription_extra_days?: number | null;
}

export interface DbPlan {
  id: string;
  name: string;
  price: number;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  plan: string;
  users: number;
  status: 'Ativo' | 'Trial' | 'Inativo' | 'Inadimplente';
  revenue: string;
  primaryColor: string;
  logoText: string;
  joined: string;
  adminEmail: string;
  plan_id?: string;
  slug?: string;
  theme_color?: string;
  subscription_due_date?: string | null;
  subscription_extra_days?: number;
  adminCount: number;
}

export type CredentialsKind = 'created' | 'reset' | 'finalized';

export interface Credentials {
  email: string;
  password: string;
  company: string;
  kind: CredentialsKind;
}

export const STATUS_BADGE: Record<string, string> = {
  Ativo: 'badge-success',
  Trial: 'badge-warning',
  Inativo: 'badge-gray',
  Inadimplente: 'badge-danger',
};

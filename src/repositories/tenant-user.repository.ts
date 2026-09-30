import { supabase } from '@/lib/supabase';

export interface TenantUser {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  permissions: string[];
  created_at: string;
}

export interface PlanUsage {
  count: number;
  maxUsers: number;
  planName: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: string;
  permissions: string[];
}

export class TenantUserRepository {
  async getAll(tenantId: string): Promise<TenantUser[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, active, permissions, created_at')
      .eq('tenant_id', tenantId)
      // Superadmin e o usuario master do painel superadmin — nunca
      // aparece na lista de usuarios de uma empresa
      .neq('role', 'superadmin')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(u => ({ ...u, permissions: u.permissions ?? [] }));
  }

  async getPlanUsage(tenantId: string): Promise<PlanUsage> {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('plan_id, name')
      .eq('id', tenantId)
      .single();

    let maxUsers = 0;
    let planName = tenant?.name ?? '';
    if (tenant?.plan_id) {
      const { data: plan } = await supabase
        .from('plans')
        .select('name, max_users')
        .eq('id', tenant.plan_id)
        .single();
      maxUsers = plan?.max_users ?? 0;
      planName = plan?.name ?? planName;
    }

    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      // Superadmin nao consome assento do plano
      .neq('role', 'superadmin');

    return { count: count ?? 0, maxUsers, planName };
  }

  async update(
    id: string,
    patch: Partial<Pick<TenantUser, 'name' | 'role' | 'active' | 'permissions'>>,
  ): Promise<void> {
    const { error } = await supabase.from('users').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async create(input: CreateUserInput): Promise<void> {
    const { data, error } = await supabase.functions.invoke('create-tenant-user', {
      body: input,
    });
    if (error) throw await this.toEdgeError(error, data);
  }

  async remove(userId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('create-tenant-user', {
      method: 'DELETE',
      body: { user_id: userId },
    });
    if (error) throw await this.toEdgeError(error, data);
  }

  // Em erro HTTP o invoke não devolve o corpo no `data`; ele fica no
  // error.context (FunctionsHttpError). Lê ambos para obter o `code`.
  private async toEdgeError(
    error: unknown,
    data: unknown,
  ): Promise<Error & { code?: string; maxUsers?: number }> {
    const payload = { ...((data ?? {}) as { error?: string; max_users?: number }) };
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        Object.assign(payload, await ctx.json());
      } catch { /* mantém fallback */ }
    }
    const code = payload.error ?? 'request_failed';
    const err = new Error(code) as Error & { code?: string; maxUsers?: number };
    err.code = code;
    if (code === 'limit_reached') err.maxUsers = payload.max_users;
    return err;
  }
}

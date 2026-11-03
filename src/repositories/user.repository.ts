import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string;
  tenant_name?: string;
  avatar?: string;
  permissions?: string[];
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, name, role, tenant_id, avatar_url, permissions')
    .eq('id', userId)
    .single();

  if (profileError || !profile) return null;

  // Superadmin nao pertence a um tenant: `.eq('id', null)` vira
  // `id=eq.null` e o PostgREST responde 400.
  let tenantName = '';
  if (profile.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', profile.tenant_id)
      .single();
    tenantName = tenant?.name ?? '';
  }

  return {
    ...profile,
    avatar: profile.avatar_url,
    tenant_name: tenantName,
  };
}

export interface TenantUserBrief {
  id: string;
  name: string;
}

/**
 * Atualiza o nome do próprio usuário.
 * Usa a RPC `update_my_profile` (SECURITY DEFINER) porque a escrita em
 * `users` é restrita ao admin do tenant — o usuário comum não passa pela
 * policy, mas a função altera apenas o próprio nome.
 */
export async function updateMyProfileName(name: string): Promise<void> {
  const { error } = await supabase.rpc('update_my_profile', { p_name: name });
  if (error) throw new Error(error.message);
}

export async function fetchTenantUsers(tenantId: string): Promise<TenantUserBrief[]> {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('tenant_id', tenantId);

  if (error) {
    console.warn('fetchTenantUsers failed:', error.message);
    return [];
  }
  return (data ?? []) as TenantUserBrief[];
}

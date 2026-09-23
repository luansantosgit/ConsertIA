import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string;
  tenant_name?: string;
  avatar?: string;
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, name, role, tenant_id, avatar_url')
    .eq('id', userId)
    .single();

  if (profileError || !profile) return null;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', profile.tenant_id)
    .single();

  return {
    ...profile,
    avatar: profile.avatar_url,
    tenant_name: tenant?.name ?? '',
  };
}

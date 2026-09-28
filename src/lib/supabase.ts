import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sessão quebrada (refresh token expirado/inválido): notifica o app em vez de
// deixar as requisições falharem com 401/RLS silenciosamente.
supabase.auth.onAuthStateChange((event) => {
  const evt = event as string;
  if (evt === 'SIGNED_OUT' || evt === 'TOKEN_REFRESH_FAILED') {
    window.dispatchEvent(new CustomEvent('session-expired'));
  }
});

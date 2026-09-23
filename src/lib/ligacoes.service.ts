import { supabase } from './supabase';
import { useAuthStore } from '@/stores/auth.store';
import type { WaCallsSession, WaCallsCall, WaCallsCanCallResult } from '@/types';

const LIGACOES_SERVER_URL = import.meta.env.VITE_LIGACOES_SERVER_URL || 'http://localhost:8080';

interface ForkSession {
  id: string;
  name?: string;
  state?: string;
  paired?: boolean;
  jid?: string;
}

export const ligacoesService = {
  async listSessions(): Promise<ForkSession[]> {
    try {
      const response = await fetch(`${LIGACOES_SERVER_URL}/api/sessions`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async createSession(name: string): Promise<ForkSession> {
    const response = await fetch(`${LIGACOES_SERVER_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error('Falha ao criar sessao de ligacao.');
    }

    return response.json();
  },

  async deleteSession(sessionId: string): Promise<void> {
    await fetch(`${LIGACOES_SERVER_URL}/api/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },

  async pairSession(sessionId: string): Promise<void> {
    const response = await fetch(`${LIGACOES_SERVER_URL}/api/sessions/${sessionId}/pair`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Falha ao iniciar pareamento.');
    }
  },

  subscribeSSE(
    onQR: (qr: string, sessionId: string) => void,
    onError: (error: Event) => void,
    onConnected: () => void
  ): EventSource {
    const es = new EventSource(`${LIGACOES_SERVER_URL}/api/events`);

    es.addEventListener('qr', (event) => {
      try {
        const data = JSON.parse(event.data);
        onQR(data.qr, data.sessionId);
      } catch {
        // Ignorar erros de parsing
      }
    });

    es.addEventListener('auth-state', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.state === 'connected' || data.paired) {
          onConnected();
        }
      } catch {
        // Ignorar
      }
    });

    es.onerror = onError;

    return es;
  },

  async getSessionStatus(sessionId: string): Promise<{ connected: boolean; jid?: string }> {
    try {
      const sessions = await this.listSessions();
      const session = sessions.find(s => s.id === sessionId);
      return {
        connected: session?.state === 'connected' || Boolean(session?.paired),
        jid: session?.jid,
      };
    } catch {
      return { connected: false };
    }
  },

  // Database operations
  async listDbSessions(): Promise<WaCallsSession[]> {
    const tenantId = useAuthStore.getState().user?.tenantId;
    if (!tenantId) return [];

    const { data, error } = await supabase
      .from('wacalls_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as WaCallsSession[];
  },

  async createDbSession(data: {
    fork_session_id: string;
    name?: string;
    phone_number?: string;
    connection_id?: string;
  }): Promise<WaCallsSession> {
    const tenantId = useAuthStore.getState().user?.tenantId;
    if (!tenantId) throw new Error('Tenant ID nao encontrado.');

    const { data: created, error } = await supabase
      .from('wacalls_sessions')
      .insert({
        ...data,
        tenant_id: tenantId,
        status: 'connecting',
      })
      .select()
      .single();

    if (error) throw error;
    return created as WaCallsSession;
  },

  async updateDbSessionStatus(
    sessionId: string,
    status: string,
    jid?: string
  ): Promise<void> {
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (jid !== undefined) updateData.jid = jid;

    const { error } = await supabase
      .from('wacalls_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) throw error;
  },

  async deleteDbSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('wacalls_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  },

  async canCall(sessionId: string): Promise<WaCallsCanCallResult> {
    const tenantId = useAuthStore.getState().user?.tenantId;
    if (!tenantId) return { allowed: false, reason: 'no_tenant' };

    const { data, error } = await supabase.rpc('can_call', {
      p_tenant_id: tenantId,
      p_session_id: sessionId,
    });

    if (error) throw error;
    return data as WaCallsCanCallResult;
  },

  async listCalls(sessionId?: string): Promise<WaCallsCall[]> {
    const tenantId = useAuthStore.getState().user?.tenantId;
    if (!tenantId) return [];

    let query = supabase
      .from('wacalls_calls')
      .select('*')
      .eq('tenant_id', tenantId);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as WaCallsCall[];
  },

  async countActiveCalls(sessionId: string): Promise<number> {
    const { count, error } = await supabase
      .from('wacalls_calls')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('status', 'active');

    if (error) throw error;
    return count ?? 0;
  },
};

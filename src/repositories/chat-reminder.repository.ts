import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';

export interface ChatReminder {
  id: string;
  tenant_id: string;
  conversation_id: string;
  contact_phone: string;
  message: string;
  status: 'pending' | 'sent' | 'cancelled';
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

// Lembretes automáticos criados no chat — o sistema envia a mensagem
// ao lead via WhatsApp na data/hora marcada (worker pg_cron).
export class ChatReminderRepository {
  private get tenantId(): string {
    return useAuthStore.getState().user?.tenantId ?? '';
  }

  async getByConversation(conversationId: string): Promise<ChatReminder[]> {
    const { data, error } = await supabase
      .from('chat_reminders')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('conversation_id', conversationId)
      .order('scheduled_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getAll(): Promise<ChatReminder[]> {
    const { data, error } = await supabase
      .from('chat_reminders')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('scheduled_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async create(input: {
    conversation_id: string;
    contact_phone: string;
    message: string;
    scheduled_at: string;
  }): Promise<ChatReminder> {
    const { data, error } = await supabase
      .from('chat_reminders')
      .insert({ ...input, tenant_id: this.tenantId, status: 'pending' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, patch: Partial<Pick<ChatReminder, 'message' | 'scheduled_at' | 'status'>>): Promise<void> {
    const { error } = await supabase
      .from('chat_reminders')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('chat_reminders').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}

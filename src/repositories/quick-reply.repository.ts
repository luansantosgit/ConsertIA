import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';

export type QuickReplyPart =
  | { type: 'text'; text: string }
  | { type: 'media'; url: string; caption?: string };

export interface QuickReply {
  id: string;
  tenant_id: string;
  shortcut: string;
  title: string;
  parts: QuickReplyPart[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export class QuickReplyRepository {
  private get tenantId(): string {
    return useAuthStore.getState().user?.tenantId ?? '';
  }

  async getAll(): Promise<QuickReply[]> {
    const { data, error } = await supabase
      .from('quick_replies')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('is_default', { ascending: false })
      .order('shortcut', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => ({ ...r, parts: Array.isArray(r.parts) ? r.parts : [] }));
  }

  async create(input: { shortcut: string; title: string; parts: QuickReplyPart[] }): Promise<QuickReply> {
    const { data, error } = await supabase
      .from('quick_replies')
      .insert({ ...input, tenant_id: this.tenantId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, patch: Partial<Pick<QuickReply, 'shortcut' | 'title' | 'parts'>>): Promise<void> {
    const { error } = await supabase
      .from('quick_replies')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('quick_replies').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // Upload de mídia: pasta do tenant, retorna URL pública
  async uploadMedia(file: File): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const path = `${this.tenantId}/qr-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('quick-replies')
      .upload(path, file, { contentType: file.type, upsert: true });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('quick-replies').getPublicUrl(path);
    return data.publicUrl;
  }
}

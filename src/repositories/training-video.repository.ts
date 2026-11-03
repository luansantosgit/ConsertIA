import { supabase } from '@/lib/supabase';
import type { TrainingVideo, TrainingVideoSource } from '@/types';

export interface TrainingVideoInput {
  title: string;
  description: string;
  topic: string;
  source: TrainingVideoSource;
  url: string;
  thumbnail_url?: string | null;
  sort_order?: number;
  active?: boolean;
}

/**
 * Conteúdo do portal de treinamento: tabela global (sem tenant_id).
 Leitura → qualquer autenticado; escrita → superadmin (RLS).
 */
export class TrainingVideoRepository {
  private tableName = 'training_videos';

  /** Vídeos ativos ordenados (página /treinamento). */
  async getActive(): Promise<TrainingVideo[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data as TrainingVideo[];
  }

  /** Lista completa para o painel do superadmin. */
  async getAll(): Promise<TrainingVideo[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data as TrainingVideo[];
  }

  async create(input: TrainingVideoInput): Promise<TrainingVideo> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as TrainingVideo;
  }

  async update(id: string, patch: Partial<TrainingVideoInput>): Promise<TrainingVideo> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as TrainingVideo;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  /** Reordena (drag & drop): atualiza o sort_order dos vídeos movidos. */
  async reorder(items: Array<{ id: string; sort_order: number }>): Promise<void> {
    await Promise.all(
      items.map(({ id, sort_order }) => this.update(id, { sort_order })),
    );
  }
}

import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import type { LandingLead, LandingLeadStatus } from '@/types';

/**
 * Leads do site institucional. Escopo superadmin (sem tenant_id):
 * inserts acontecem via Edge Function pública `landing-lead`.
 */
export class LandingLeadRepository extends BaseSupabaseRepository<LandingLead> {
  constructor() {
    super('landing_leads', '');
  }

  async getById(id: string): Promise<LandingLead | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).maybeSingle()
    );
  }

  async getAll(): Promise<LandingLead[]> {
    return this.fetchMany(
      supabase.from(this.tableName).select('*').order('created_at', { ascending: false })
    );
  }

  async create(data: Partial<LandingLead>): Promise<LandingLead> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert({ ...data })
      .select()
      .single();
    if (error) throw error;
    return created as LandingLead;
  }

  async update(id: string, data: Partial<LandingLead>): Promise<LandingLead> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return updated as LandingLead;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;
  }

  async setStatus(id: string, status: LandingLeadStatus): Promise<LandingLead> {
    return this.update(id, { status });
  }
}

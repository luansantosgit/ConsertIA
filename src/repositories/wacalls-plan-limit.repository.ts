import { supabase } from '@/lib/supabase';
import { BaseSupabaseRepository } from './base';
import { useAuthStore } from '@/stores/auth.store';
import type { WaCallsPlanLimit } from '@/types';

export class WaCallsPlanLimitRepository extends BaseSupabaseRepository<WaCallsPlanLimit> {
  constructor() {
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    super('wacalls_plan_limits', tenantId);
  }

  async getById(id: string): Promise<WaCallsPlanLimit | null> {
    return this.fetchSingle(
      supabase.from(this.tableName).select('*').eq('id', id).single()
    );
  }

  async getAll(): Promise<WaCallsPlanLimit[]> {
    return this.fetchMany(
      supabase
        .from(this.tableName)
        .select('*')
        .eq('active', true)
        .order('plan_name', { ascending: true })
    );
  }

  async create(data: Partial<WaCallsPlanLimit>): Promise<WaCallsPlanLimit> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created as WaCallsPlanLimit;
  }

  async update(id: string, data: Partial<WaCallsPlanLimit>): Promise<WaCallsPlanLimit> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated as WaCallsPlanLimit;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getByPlanName(planName: string): Promise<WaCallsPlanLimit | null> {
    return this.fetchSingle(
      supabase
        .from(this.tableName)
        .select('*')
        .eq('plan_name', planName)
        .eq('active', true)
        .single()
    );
  }

  async canCall(sessionId: string): Promise<{
    allowed: boolean;
    reason?: string;
    active_calls?: number;
    calls_today?: number;
    max_concurrent?: number;
    max_per_day?: number;
  }> {
    const { data, error } = await supabase.rpc('can_call', {
      p_tenant_id: this.tenantId,
      p_session_id: sessionId,
    });

    if (error) throw error;
    return data as {
      allowed: boolean;
      reason?: string;
      active_calls?: number;
      calls_today?: number;
      max_concurrent?: number;
      max_per_day?: number;
    };
  }
}

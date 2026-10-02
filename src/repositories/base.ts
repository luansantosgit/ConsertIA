import { useAuthStore } from '@/stores/auth.store';
import type { PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js';

export interface BaseRepository<T> {
  getById(id: string): Promise<T | null>;
  getAll(filters?: Record<string, unknown>): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export abstract class BaseSupabaseRepository<T> implements BaseRepository<T> {
  protected tableName: string;

  constructor(tableName: string, _legacyTenantId?: string) {
    this.tableName = tableName;
    void _legacyTenantId;
  }

  // TenantId VIVO, lido no momento de cada query. Repos criados antes da
  // sessao restaurar (chunk lazy em cold boot) nao podem congelar '' —
  // isso causava 400 (tenant_id=eq.) ate a pagina ser recarregada.
  protected get tenantId(): string {
    return useAuthStore.getState().user?.tenantId ?? '';
  }

  protected async fetchSingle<R>(promise: PromiseLike<PostgrestSingleResponse<R>>): Promise<R | null> {
    const { data, error } = await promise;
    if (error || !data) return null;
    return data as R;
  }

  protected async fetchMany<R>(promise: PromiseLike<PostgrestResponse<R>>): Promise<R[]> {
    const { data, error } = await promise;
    if (error || !data) return [];
    return data as R[];
  }

  abstract getById(id: string): Promise<T | null>;
  abstract getAll(filters?: Record<string, unknown>): Promise<T[]>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<void>;
}

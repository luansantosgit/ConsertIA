import { supabase } from '@/lib/supabase';
import type { PostgrestSingleResponse, PostgrestManyResponse } from '@supabase/supabase-js';

export interface BaseRepository<T> {
  getById(id: string): Promise<T | null>;
  getAll(filters?: Record<string, unknown>): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export abstract class BaseSupabaseRepository<T> implements BaseRepository<T> {
  protected tableName: string;
  protected tenantId: string;

  constructor(tableName: string, tenantId: string) {
    this.tableName = tableName;
    this.tenantId = tenantId;
  }

  protected async fetchSingle<R>(promise: Promise<PostgrestSingleResponse<R>>): Promise<R | null> {
    const { data, error } = await promise;
    if (error || !data) return null;
    return data as R;
  }

  protected async fetchMany<R>(promise: Promise<PostgrestManyResponse<R>>): Promise<R[]> {
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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiAgentSettingsRepository } from '@/repositories/ai-agent-settings.repository';

/**
 * Issue #94: tenant sem linha em ai_agent_settings (ainda nao salvou
 * nada) precisa aparecer com o agente ATIVO, perguntando o nome e sem
 * modelo travado (o select usa o padrao do administrador).
 */

const mockSupabase = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => ({
            maybeSingle: async () => ({ data: mockSupabase.row, error: null }),
          }),
        }),
      }),
    }),
  },
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: { getState: () => ({ user: { tenantId: 'tenant-1' } }) },
}));

describe('AiAgentSettingsRepository.get (tenant novo)', () => {
  beforeEach(() => {
    mockSupabase.row = null;
  });

  it('nasce com agente ativo e perguntando o nome do lead', async () => {
    const settings = await new AiAgentSettingsRepository().get();

    expect(settings.active).toBe(true);
    expect(settings.ask_name_enabled).toBe(true);
  });

  it('nao trava um modelo fora da lista liberada', async () => {
    const settings = await new AiAgentSettingsRepository().get();

    expect(settings.openrouter_model).toBe('');
  });

  it('preserva o que ja foi salvo no banco', async () => {
    mockSupabase.row = {
      id: 'row-1',
      tenant_id: 'tenant-1',
      active: false,
      ask_name_enabled: false,
      openrouter_model: 'deepseek/deepseek-v4-flash',
    };

    const settings = await new AiAgentSettingsRepository().get();

    expect(settings.active).toBe(false);
    expect(settings.ask_name_enabled).toBe(false);
    expect(settings.openrouter_model).toBe('deepseek/deepseek-v4-flash');
  });
});

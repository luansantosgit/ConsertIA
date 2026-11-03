// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  ensureAiDefaults,
  resolveDefaultModel,
  normalizePresentationStyle,
} from '../../../supabase/functions/_shared/ai-defaults.ts';

/**
 * Issue #94: tenant novo (wizard ou criado pelo superadmin) precisa
 * nascer PRONTO — agente ativo, perguntando o nome do lead e no modelo
 * liberado pelo administrador (sem o aviso de "modelo fora da lista").
 */

type Row = Record<string, any>;

function makeAdmin(rows: Record<string, Row[]>) {
  const inserted: { table: string; row: Row }[] = [];
  const updated: { table: string; row: Row }[] = [];
  const admin = {
    from(table: string) {
      const filters: Row = {};
      const builder = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          filters[col] = val;
          return builder;
        },
        limit: () => builder,
        maybeSingle: async () => {
          const found = (rows[table] ?? []).find(r =>
            Object.entries(filters).every(([k, v]) => r[k] === v),
          );
          return { data: found ?? null, error: null };
        },
        insert: async (row: Row) => {
          inserted.push({ table, row });
          return { data: row, error: null };
        },
        update: (row: Row) => {
          updated.push({ table, row });
          return builder;
        },
      };
      return builder;
    },
  };
  return { admin, inserted, updated };
}

const TENANT = 'tenant-1';

describe('resolveDefaultModel', () => {
  it('usa o padrao global no modo "all"', async () => {
    const { admin } = makeAdmin({
      platform_ai_config: [
        {
          distribution_mode: 'all',
          allowed_models: ['deepseek/deepseek-v4-flash', 'openai/gpt-4o-mini'],
          default_model: 'deepseek/deepseek-v4-flash',
        },
      ],
      tenant_ai_entitlements: [{ tenant_id: TENANT, allowed_models: null, default_model: null }],
    });

    await expect(resolveDefaultModel(admin, TENANT)).resolves.toBe('deepseek/deepseek-v4-flash');
  });

  it('usa o padrao da empresa no modo "selected"', async () => {
    const { admin } = makeAdmin({
      platform_ai_config: [
        {
          distribution_mode: 'selected',
          allowed_models: ['deepseek/deepseek-v4-flash'],
          default_model: 'deepseek/deepseek-v4-flash',
        },
      ],
      tenant_ai_entitlements: [
        {
          tenant_id: TENANT,
          allowed_models: ['openai/gpt-4o-mini'],
          default_model: 'openai/gpt-4o-mini',
        },
      ],
    });

    await expect(resolveDefaultModel(admin, TENANT)).resolves.toBe('openai/gpt-4o-mini');
  });

  it('cai para o primeiro da lista quando o padrao nao esta nela', async () => {
    const { admin } = makeAdmin({
      platform_ai_config: [
        {
          distribution_mode: 'all',
          allowed_models: ['openai/gpt-4o-mini', 'deepseek/deepseek-v4-flash'],
          default_model: 'modelo-inexistente',
        },
      ],
    });

    await expect(resolveDefaultModel(admin, TENANT)).resolves.toBe('openai/gpt-4o-mini');
  });

  it('devolve null sem lista liberada (nao forca modelo)', async () => {
    const { admin } = makeAdmin({
      platform_ai_config: [
        { distribution_mode: 'all', allowed_models: [], default_model: null },
      ],
    });

    await expect(resolveDefaultModel(admin, TENANT)).resolves.toBeNull();
  });
});

describe('ensureAiDefaults', () => {
  it('cria a settings com agente ativo, perguntando nome e modelo liberado', async () => {
    const { admin, inserted } = makeAdmin({
      ai_agent_settings: [],
      platform_ai_config: [
        {
          distribution_mode: 'all',
          allowed_models: ['deepseek/deepseek-v4-flash'],
          default_model: 'deepseek/deepseek-v4-flash',
        },
      ],
      tenant_ai_entitlements: [],
      ai_quote_settings: [],
      ai_diagnosis_settings: [],
      ai_configs: [],
    });

    await ensureAiDefaults(admin, TENANT);

    const agent = inserted.find(i => i.table === 'ai_agent_settings');
    expect(agent?.row).toMatchObject({
      tenant_id: TENANT,
      active: true,
      ask_name_enabled: true,
      openrouter_model: 'deepseek/deepseek-v4-flash',
    });
    // Demais tabelas de settings tambem nascem
    expect(inserted.map(i => i.table)).toEqual(
      expect.arrayContaining([
        'ai_agent_settings',
        'ai_quote_settings',
        'ai_diagnosis_settings',
        'ai_configs',
      ]),
    );
  });

  it('nao sobrescreve configuracao existente', async () => {
    const { admin, inserted } = makeAdmin({
      ai_agent_settings: [{ id: 'row-1', tenant_id: TENANT, active: false }],
      platform_ai_config: [],
      tenant_ai_entitlements: [],
      ai_quote_settings: [{ tenant_id: TENANT }],
      ai_diagnosis_settings: [{ tenant_id: TENANT }],
      ai_configs: [{ tenant_id: TENANT }],
    });

    await ensureAiDefaults(admin, TENANT);

    expect(inserted.find(i => i.table === 'ai_agent_settings')).toBeUndefined();
  });

  it('sem lista liberada, nao grava modelo (mantem o default do banco)', async () => {
    const { admin, inserted } = makeAdmin({
      ai_agent_settings: [],
      platform_ai_config: [
        { distribution_mode: 'all', allowed_models: [], default_model: null },
      ],
      tenant_ai_entitlements: [],
      ai_quote_settings: [{ tenant_id: TENANT }],
      ai_diagnosis_settings: [{ tenant_id: TENANT }],
      ai_configs: [{ tenant_id: TENANT }],
    });

    await ensureAiDefaults(admin, TENANT);

    const agent = inserted.find(i => i.table === 'ai_agent_settings');
    expect(agent?.row.openrouter_model).toBeUndefined();
    expect(agent?.row.active).toBe(true);
    expect(agent?.row.ask_name_enabled).toBe(true);
  });
});

/**
 * Issue #95: as escolhas da etapa "Configure seu agente de IA" do wizard
 * precisam chegar em ai_agent_settings (nome, tom, saudacao e automacoes).
 */
describe('ensureAiDefaults — config do wizard', () => {
  const wizardConfig = {
    agent_name: 'Dona Ana',
    agent_presentation: 'formal',
    agent_greeting: true,
    agent_auto_schedule: false,
    agent_auto_os: true,
  };

  it('aplica as escolhas na criacao das settings', async () => {
    const { admin, inserted } = makeAdmin({
      ai_agent_settings: [],
      platform_ai_config: [
        {
          distribution_mode: 'all',
          allowed_models: ['deepseek/deepseek-v4-flash'],
          default_model: 'deepseek/deepseek-v4-flash',
        },
      ],
      tenant_ai_entitlements: [],
      ai_quote_settings: [{ tenant_id: TENANT }],
      ai_diagnosis_settings: [{ tenant_id: TENANT }],
      ai_configs: [{ tenant_id: TENANT }],
    });

    await ensureAiDefaults(admin, TENANT, wizardConfig);

    const agent = inserted.find(i => i.table === 'ai_agent_settings');
    expect(agent?.row).toMatchObject({
      tenant_id: TENANT,
      active: true,
      ask_name_enabled: true,
      agent_name: 'Dona Ana',
      presentation_style: 'formal',
      greeting_enabled: true,
      auto_schedule_enabled: false,
      auto_os_enabled: true,
    });
  });

  it('atualiza as settings quando o tenant ja tinha linha', async () => {
    const { admin, inserted, updated } = makeAdmin({
      ai_agent_settings: [{ id: 'row-1', tenant_id: TENANT, active: true }],
      platform_ai_config: [],
      tenant_ai_entitlements: [],
      ai_quote_settings: [{ tenant_id: TENANT }],
      ai_diagnosis_settings: [{ tenant_id: TENANT }],
      ai_configs: [{ tenant_id: TENANT }],
    });

    await ensureAiDefaults(admin, TENANT, wizardConfig);

    expect(inserted.find(i => i.table === 'ai_agent_settings')).toBeUndefined();
    expect(updated.find(i => i.table === 'ai_agent_settings')?.row).toMatchObject({
      agent_name: 'Dona Ana',
      presentation_style: 'formal',
      greeting_enabled: true,
      auto_schedule_enabled: false,
      auto_os_enabled: true,
    });
  });

  it('sem config do wizard, nao mexe nas settings existentes', async () => {
    const { admin, updated } = makeAdmin({
      ai_agent_settings: [{ id: 'row-1', tenant_id: TENANT, active: true }],
      platform_ai_config: [],
      tenant_ai_entitlements: [],
      ai_quote_settings: [{ tenant_id: TENANT }],
      ai_diagnosis_settings: [{ tenant_id: TENANT }],
      ai_configs: [{ tenant_id: TENANT }],
    });

    await ensureAiDefaults(admin, TENANT);

    expect(updated.find(i => i.table === 'ai_agent_settings')).toBeUndefined();
  });
});

describe('normalizePresentationStyle', () => {
  it('aceita os estilos validos', () => {
    expect(normalizePresentationStyle('formal')).toBe('formal');
    expect(normalizePresentationStyle('tecnico')).toBe('tecnico');
    expect(normalizePresentationStyle('proximo')).toBe('proximo');
    expect(normalizePresentationStyle('AMIGAVEL')).toBe('amigavel');
  });

  it('cai para amigavel quando o valor e invalido', () => {
    expect(normalizePresentationStyle('robotica')).toBe('amigavel');
    expect(normalizePresentationStyle(null)).toBe('amigavel');
    expect(normalizePresentationStyle(undefined)).toBe('amigavel');
  });
});

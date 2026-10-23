-- Relatórios: insights de IA (análise periódica) + contadores separados de consumo
-- por origem do token (plataforma x próprio)

-- 1. Contadores separados
ALTER TABLE ai_token_usage
  ADD COLUMN IF NOT EXISTS token_source text not null default 'platform';

ALTER TABLE ai_token_usage
  DROP CONSTRAINT IF EXISTS ai_token_usage_tenant_id_period_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_token_usage_tenant_period_source_key'
  ) THEN
    ALTER TABLE ai_token_usage
      ADD CONSTRAINT ai_token_usage_tenant_period_source_key
      UNIQUE (tenant_id, period, token_source);
  END IF;
END $$;

-- 2. Insights de IA para o painel de relatórios
create table if not exists ai_insights (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  period text not null,
  insights text not null,
  stats jsonb not null default '{}'::jsonb,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_insights_tenant on ai_insights(tenant_id, created_at desc);

alter table ai_insights enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'TI ai_insights') THEN
    CREATE POLICY "TI ai_insights" ON ai_insights
      FOR ALL
      USING ((tenant_id)::text = coalesce(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Superadmin ai_insights') THEN
    CREATE POLICY "Superadmin ai_insights" ON ai_insights
      FOR ALL
      USING (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin');
  END IF;
END $$;

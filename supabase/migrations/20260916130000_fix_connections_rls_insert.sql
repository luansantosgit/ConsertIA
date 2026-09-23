-- Fix: RLS policy na tabela connections precisa de WITH CHECK para INSERT

-- Remover policy antiga que so tem USING (bloqueia INSERT)
drop policy if exists "TI connections" on connections;

-- Recriar com USING + WITH CHECK
create policy "TI connections" on connections
  for all
  using (tenant_id::text = auth.jwt() ->> 'tenant_id')
  with check (tenant_id::text = auth.jwt() ->> 'tenant_id');

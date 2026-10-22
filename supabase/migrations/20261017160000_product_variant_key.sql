-- Produtos com múltiplas qualidades: chave de variante agrupa o MESMO
-- produto em qualidades diferentes (original/premium/compatível...).
-- Quem está sozinho no grupo (planilha com qualidade única) fica igual —
-- a chave existe mas não muda nada visualmente.
alter table products add column if not exists variant_key text;

create index if not exists idx_products_variant_key
  on products (tenant_id, variant_key);

-- Chave = marca|modelo|nome-sem-palavras-de-qualidade (minúsculo).
-- "com aro/sem aro/borda" FICAM na chave (produtos fisicamente diferentes);
-- só a qualidade (ori/original/premium/compatível/gen/copy/incell/...) sai.
update products p
set variant_key = lower(
  concat_ws('|',
    nullif(lower(btrim(coalesce(p.device_brand, ''))), ''),
    nullif(lower(btrim(coalesce(p.device_model, ''))), ''),
    nullif(
      btrim(
        regexp_replace(
          regexp_replace(
            lower(coalesce(p.name, '')),
            '\y(ori|original|premium|compat[ií]vel|gen[ée]rica|gen|copy|c[óo]pia|incell|recondicionada|refurb|rebuild|lacradora|lacre|importada|nacional)\y',
            '', 'gi'
          ),
          '\s+', ' ', 'gi'
        )
      ),
      ''
    )
  )
)
where p.tenant_id is not null;

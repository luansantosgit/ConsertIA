/**
 * Chave de variante: agrupa o MESMO produto em diferentes qualidades
 * (original/premium/compatível/incell/recondicionada).
 * - Planilha com qualidade única: a chave existe, mas o produto fica
 *   sozinho no grupo — nada muda visualmente
 * - Planilha com várias qualidades: linhas compartilham a chave e a
 *   listagem/agente de IA podem tratar como opções do mesmo produto
 *
 * "com aro/sem aro/borda fina/curvada" FICAM na chave: são produtos
 * fisicamente diferentes. Só a qualidade sai.
 */

const QUALITY_WORDS =
  /\b(ori|original|premium|compat[ií]vel|gen[ée]rica|gen|copy|c[óo]pia|incell|recondicionada|refurb|rebuild|lacradora|lacre|importada|nacional)\b/gi;

export interface VariantKeyInput {
  name: string;
  device_brand?: string | null;
  device_model?: string | null;
}

export function computeVariantKey(p: VariantKeyInput): string {
  const base = p.name.replace(QUALITY_WORDS, ' ').replace(/\s+/g, ' ').trim();
  return [p.device_brand ?? '', p.device_model ?? '', base]
    .map((s) => s.toLowerCase().trim())
    .filter(Boolean)
    .join('|');
}

/** Qualidades canônicas que recebem badge na listagem (exclui valores de categoria legados) */
export const QUALITY_BADGES: Record<string, { label: string; bg: string; color: string }> = {
  original: { label: 'Original', bg: 'var(--success-bg)', color: 'var(--success-text)' },
  premium: { label: 'Premium', bg: 'var(--primary-light)', color: 'var(--primary-text)' },
  'compatível': { label: 'Compatível', bg: 'var(--warning-bg)', color: 'var(--warning-text)' },
  incell: { label: 'Incell', bg: 'var(--info-bg)', color: 'var(--info-text)' },
  recondicionada: { label: 'Recond.', bg: 'var(--hover-bg)', color: 'var(--text-secondary)' },
};

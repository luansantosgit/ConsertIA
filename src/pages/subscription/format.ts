// Helpers de formatação da área de assinaturas
export const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Paga',
  overdue: 'Vencida',
  canceled: 'Cancelada',
};

export const STATUS_BADGES: Record<string, string> = {
  pending: 'badge badge-warning',
  paid: 'badge badge-success',
  overdue: 'badge badge-danger',
  canceled: 'badge badge-gray',
};

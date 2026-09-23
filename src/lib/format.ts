export function formatCurrency(value: number): string {
  return `R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  if (isNaN(diff)) return dateStr;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} dia(s) atrás`;
  if (hours > 0) return `${hours} hora(s) atrás`;
  if (minutes > 0) return `${minutes} minuto(s) atrás`;
  return 'agora';
}

// Codigo curto e profissional para OS a partir do UUID (ex: OS-7FA97C)
export function formatOSCode(id: string): string {
  if (!id) return 'OS-??????';
  const clean = id.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `OS-${clean || '??????'}`;
}

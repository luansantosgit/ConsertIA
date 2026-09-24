import type { AppointmentStatus } from '@/types';

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: '#4f46e5',
  confirmed: '#22c55e',
  cancelled: '#ef4444',
  rescheduled: '#f59e0b',
  completed: '#0d9488',
  no_show: '#dc2626',
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  rescheduled: 'Remarcado',
  completed: 'Compareceu',
  no_show: 'Não compareceu',
};

export const STATUS_BADGES: Record<AppointmentStatus, string> = {
  scheduled: 'badge badge-info',
  confirmed: 'badge badge-success',
  cancelled: 'badge badge-danger',
  rescheduled: 'badge badge-warning',
  completed: 'badge badge-primary',
  no_show: 'badge badge-danger',
};

export function statusColor(status: AppointmentStatus | undefined, fallback: string): string {
  return (status && STATUS_COLORS[status]) || fallback;
}

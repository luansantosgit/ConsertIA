import type { CalendarEvent, Customer, ServiceOrder } from '@/types';

export type StatusGroupKey = 'pendente' | 'aguardando_peca' | 'em_andamento' | 'concluidas' | 'canceladas';

export interface StatusGroupDef {
  key: StatusGroupKey;
  labelKey: string;
  statuses: string[];
  color: string;
}

export const STATUS_GROUPS: StatusGroupDef[] = [
  { key: 'pendente', labelKey: 'Pendente', statuses: ['pending', 'diagnosis', 'awaiting_approval', 'approved'], color: '#f59e0b' },
  { key: 'aguardando_peca', labelKey: 'Aguardando Peça', statuses: ['awaiting_part'], color: '#f97316' },
  { key: 'em_andamento', labelKey: 'Em Andamento', statuses: ['in_progress'], color: '#3b82f6' },
  { key: 'concluidas', labelKey: 'Concluídas', statuses: ['completed', 'ready'], color: '#22c55e' },
  { key: 'canceladas', labelKey: 'Canceladas', statuses: ['cancelled'], color: '#ef4444' },
];

export const ACTIVE_STATUSES = ['pending', 'diagnosis', 'awaiting_approval', 'approved', 'awaiting_part', 'in_progress'];

export interface StatusGroupCount {
  key: StatusGroupKey;
  labelKey: string;
  color: string;
  count: number;
}

export interface TeamRow {
  id: string;
  name: string;
  completed: number;
  avgHours: number | null;
  successRate: number | null;
}

export interface DashboardStats {
  totalCustomers: number;
  newThisMonth: number;
  newLastMonth: number;
  newPct: number;
  newSpark: number[];
  returningCount: number;
  returningThisMonth: number;
  returningLastMonth: number;
  returningPct: number;
  returningSpark: number[];
  ordersThisMonth: number;
  ordersLastMonth: number;
  inProgressCount: number;
  avgHoursThisMonth: number | null;
  avgHoursLastMonth: number | null;
  conversionPct: number | null;
  conversionDeltaPct: number | null;
  totalEvents: number;
  eventsThisMonth: number;
  eventsLastMonth: number;
  groups: StatusGroupCount[];
  eventDates: (string | undefined)[];
  orderCreatedDates: (string | undefined)[];
  orderCompletedDates: (string | undefined)[];
  recentAppointments: CalendarEvent[];
  team: TeamRow[];
  aiChats: AiMetric;
  aiEvents: AiMetric;
  aiOrders: AiMetric;
}

export interface AiMetric {
  total: number;
  thisMonth: number;
  lastMonth: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isInMonth(iso: string | undefined | null, monthsAgo: number): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  return diff === monthsAgo;
}

export function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return 100;
  return Math.round(((curr - prev) / prev) * 100);
}

function completionHours(o: ServiceOrder): number | null {
  if (!o.completed_at || !o.created_at) return null;
  const ms = new Date(o.completed_at).getTime() - new Date(o.created_at).getTime();
  return ms > 0 ? ms / 3600000 : null;
}

function avgCompletionHours(orders: ServiceOrder[]): number | null {
  const list = orders.map(completionHours).filter((h): h is number => h != null);
  if (!list.length) return null;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

export function formatHours(h: number | null): string {
  if (h == null) return '—';
  const mins = Math.round(h * 60);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ${mins % 60}min`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function countByDay(dates: (string | undefined | null)[], days: number): number[] {
  const counts = new Array(days).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const iso of dates) {
    if (!iso) continue;
    const d = new Date(iso);
    if (isNaN(d.getTime())) continue;
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff < days) counts[days - 1 - diff]++;
  }
  return counts;
}

export function countByMonth(dates: (string | undefined | null)[], months = 6): number[] {
  const counts = new Array(months).fill(0);
  const now = new Date();
  for (const iso of dates) {
    if (!iso) continue;
    const d = new Date(iso);
    if (isNaN(d.getTime())) continue;
    const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (diff >= 0 && diff < months) counts[months - 1 - diff]++;
  }
  return counts;
}

export function todayLocalStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function statusGroupCounts(orders: ServiceOrder[]): StatusGroupCount[] {
  return STATUS_GROUPS.map((g) => ({
    key: g.key,
    labelKey: g.labelKey,
    color: g.color,
    count: orders.filter((o) => g.statuses.includes(o.status)).length,
  }));
}

function returningByMonth(customers: Customer[], orders: ServiceOrder[]): number[] {
  const byCustomer = new Map<string, ServiceOrder[]>();
  for (const o of orders) {
    if (!o.customer_id) continue;
    const list = byCustomer.get(o.customer_id) ?? [];
    list.push(o);
    byCustomer.set(o.customer_id, list);
  }
  const secondOrderDates: string[] = [];
  for (const list of byCustomer.values()) {
    const sorted = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (sorted.length >= 2 && sorted[1].created_at) secondOrderDates.push(sorted[1].created_at);
  }
  void customers;
  return countByMonth(secondOrderDates, 6);
}

function buildTeam(orders: ServiceOrder[], users: { id: string; name: string }[]): TeamRow[] {
  const byTech = new Map<string, ServiceOrder[]>();
  for (const o of orders) {
    if (!o.technician_id) continue;
    const list = byTech.get(o.technician_id) ?? [];
    list.push(o);
    byTech.set(o.technician_id, list);
  }
  const rows: TeamRow[] = [];
  for (const [id, list] of byTech.entries()) {
    const completed = list.filter((o) => o.status === 'completed' || o.status === 'ready').length;
    const notCancelled = list.filter((o) => o.status !== 'cancelled').length;
    const found = users.find((u) => u.id === id);
    const name = found?.name ?? (UUID_RE.test(id) ? '' : id);
    rows.push({
      id,
      name,
      completed,
      avgHours: avgCompletionHours(list),
      successRate: notCancelled > 0 ? Math.round((completed / notCancelled) * 100) : null,
    });
  }
  return rows.sort((a, b) => b.completed - a.completed);
}

export function computeDashboardStats(
  customers: Customer[],
  orders: ServiceOrder[],
  events: CalendarEvent[],
  users: { id: string; name: string }[],
  aiChats: AiMetric
): DashboardStats {
  const totalCustomers = customers.length;
  const newThisMonth = customers.filter((c) => isInMonth(c.created_at, 0)).length;
  const newLastMonth = customers.filter((c) => isInMonth(c.created_at, 1)).length;

  const osCountByCustomer = new Map<string, number>();
  for (const o of orders) {
    if (o.customer_id) osCountByCustomer.set(o.customer_id, (osCountByCustomer.get(o.customer_id) ?? 0) + 1);
  }
  const returningIds = new Set([...osCountByCustomer.entries()].filter(([, c]) => c >= 2).map(([id]) => id));
  const returningSpark = returningByMonth(customers, orders);
  const returningThisMonth = returningSpark[returningSpark.length - 1];
  const returningLastMonth = returningSpark[returningSpark.length - 2];

  const ordersThisMonth = orders.filter((o) => isInMonth(o.created_at, 0)).length;
  const ordersLastMonth = orders.filter((o) => isInMonth(o.created_at, 1)).length;
  const inProgressCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;

  const completedThisMonth = orders.filter((o) => isInMonth(o.completed_at, 0));
  const completedLastMonth = orders.filter((o) => isInMonth(o.completed_at, 1));

  const eventsThisMonth = events.filter((e) => isInMonth(e.created_at, 0));
  const eventsLastMonth = events.filter((e) => isInMonth(e.created_at, 1));
  const convThis = eventsThisMonth.length ? (eventsThisMonth.filter((e) => e.os_id).length / eventsThisMonth.length) * 100 : null;
  const convLast = eventsLastMonth.length ? (eventsLastMonth.filter((e) => e.os_id).length / eventsLastMonth.length) * 100 : null;
  const conversionPct = events.length ? Math.round((events.filter((e) => e.os_id).length / events.length) * 100) : null;
  const conversionDeltaPct = convThis != null && convLast != null ? Math.round(convThis - convLast) : null;

  const today = todayLocalStr();
  const upcoming = events
    .filter((e) => (e.date ?? '') >= today)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || (a.start_time ?? '').localeCompare(b.start_time ?? ''))
    .slice(0, 5);
  const recentAppointments = upcoming.length
    ? upcoming
    : [...events]
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || (b.start_time ?? '').localeCompare(a.start_time ?? ''))
        .slice(0, 5);

  const aiEventDates = events.filter((e) => e.created_by === 'ai').map((e) => e.created_at);
  const aiOrderDates = orders.filter((o) => o.origin === 'ai').map((o) => o.created_at);
  const aiEventSpark = countByMonth(aiEventDates, 2);
  const aiOrderSpark = countByMonth(aiOrderDates, 2);

  return {
    totalCustomers,
    newThisMonth,
    newLastMonth,
    newPct: totalCustomers ? Math.round((newThisMonth / totalCustomers) * 100) : 0,
    newSpark: countByMonth(customers.map((c) => c.created_at), 6),
    returningCount: returningIds.size,
    returningThisMonth,
    returningLastMonth,
    returningPct: totalCustomers ? Math.round((returningIds.size / totalCustomers) * 100) : 0,
    returningSpark,
    ordersThisMonth,
    ordersLastMonth,
    inProgressCount,
    avgHoursThisMonth: avgCompletionHours(completedThisMonth),
    avgHoursLastMonth: avgCompletionHours(completedLastMonth),
    conversionPct,
    conversionDeltaPct,
    totalEvents: events.length,
    eventsThisMonth: eventsThisMonth.length,
    eventsLastMonth: eventsLastMonth.length,
    groups: statusGroupCounts(orders),
    eventDates: events.map((e) => e.created_at),
    orderCreatedDates: orders.map((o) => o.created_at),
    orderCompletedDates: orders.map((o) => o.completed_at),
    recentAppointments,
    team: buildTeam(orders, users),
    aiChats,
    aiEvents: { total: aiEventDates.length, thisMonth: aiEventSpark[1], lastMonth: aiEventSpark[0] },
    aiOrders: { total: aiOrderDates.length, thisMonth: aiOrderSpark[1], lastMonth: aiOrderSpark[0] },
  };
}

import React from 'react';
import { Users, FileText, ArrowRight, Edit2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { ServiceOrderRepository } from '@/repositories/service-order.repository';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { TransactionRepository } from '@/repositories/transaction.repository';
import { CustomerRepository } from '@/repositories/customer.repository';
import type { ServiceOrder, ServiceOrderStatus, Customer } from '@/types';
import { OSModal } from '@/components/OSModal';
import { SkeletonStats, SkeletonCard } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';

const statusLabels: Record<ServiceOrderStatus, string> = {
  pending: 'Pendente',
  diagnosis: 'Diagnóstico',
  awaiting_approval: 'Ag. Aprovação',
  approved: 'Aprovado',
  awaiting_part: 'Ag. Peça',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  ready: 'Pronto',
  cancelled: 'Cancelado',
};


function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatCurrency(value: number): string {
  return `R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}


function getEquipmentEmoji(subject: string): string {
  const lower = subject.toLowerCase();
  if (lower.includes('iphone') || lower.includes('celular') || lower.includes('phone')) return '📱';
  if (lower.includes('notebook') || lower.includes('dell') || lower.includes('computador')) return '💻';
  if (lower.includes('playstation') || lower.includes('ps5') || lower.includes('console')) return '🎮';
  if (lower.includes('ipad') || lower.includes('tablet')) return '📱';
  if (lower.includes('impressora')) return '🖨️';
  return '🔧';
}

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [showOSModal, setShowOSModal] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [customerCount, setCustomerCount] = React.useState(0);
  const [serviceOrders, setServiceOrders] = React.useState<ServiceOrder[]>([]);
  const [statusCounts, setStatusCounts] = React.useState<Record<ServiceOrderStatus, number>>({} as Record<ServiceOrderStatus, number>);
  const [openConversations, setOpenConversations] = React.useState(0);
  const [totalIncome, setTotalIncome] = React.useState(0);
  const [totalExpenses, setTotalExpenses] = React.useState(0);
  const [customers, setCustomers] = React.useState<Customer[]>([]);

  React.useEffect(() => {
    const handler = () => setShowOSModal(true);
    window.addEventListener('header-action-click', handler);
    return () => window.removeEventListener('header-action-click', handler);
  }, []);

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const customerRepo = new CustomerRepository();
        const soRepo = new ServiceOrderRepository();
        const convRepo = new ConversationRepository();
        const txRepo = new TransactionRepository();

        const [custCount, allSO, counts, convCount, income, expenses, recentCustomers] =
          await Promise.all([
            customerRepo.count(),
            soRepo.getAll(),
            soRepo.countByStatus(),
            convRepo.getOpen().then((c) => c.length),
            txRepo.getTotalIncome(),
            txRepo.getTotalExpenses(),
            customerRepo.getAll().then((list) => list.slice(0, 5)),
          ]);

        setCustomerCount(custCount);
        setServiceOrders(allSO);
        setStatusCounts(counts);
        setOpenConversations(convCount);
        setTotalIncome(income);
        setTotalExpenses(expenses);
        setCustomers(recentCustomers);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Erro ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const nextSO = serviceOrders.find((so) =>
    ['pending', 'diagnosis', 'awaiting_approval'].includes(so.status)
  );

  const recentOrders = serviceOrders.slice(0, 7);

  const openOrdersCount = (statusCounts.pending ?? 0) + (statusCounts.in_progress ?? 0) + (statusCounts.diagnosis ?? 0);

  const incomeProgress = totalIncome + totalExpenses > 0
    ? Math.round((totalIncome / (totalIncome + totalExpenses)) * 100)
    : 0;

  const MiniStatIcon = ({ type }: { type: 'customers' | 'orders' }) => (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="22" r="22" fill={type === 'customers' ? '#eef2ff' : '#fef2f2'} />
      {type === 'customers' ? (
        <>
          <circle cx="18" cy="18" r="5" fill="#4f46e5" opacity="0.7" />
          <circle cx="26" cy="20" r="4" fill="#4f46e5" />
          <path d="M10 34c0-5 4-8 8-8M26 32c0-4 3-6 6-6" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <rect x="14" y="13" width="16" height="20" rx="3" fill="#ef4444" opacity="0.8" />
          <path d="M18 19h8M18 23h6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );

  if (error) {
    return (
      <div className="page" style={{ padding: '24px 28px' }}>
        <ErrorMessage message={error} onRetry={() => { setError(null); setLoading(true); }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SkeletonStats />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: '24px 28px', gap: 20 }}>
      {showOSModal && (
        <OSModal
          onClose={() => setShowOSModal(false)}
          onSave={() => setShowOSModal(false)}
        />
      )}
      <div className="dashboard-grid">

        {/* ── Column 1: Left panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="appt-card">
            <div className="appt-card-title">
              {t('Próxima OS')}
              {nextSO && <div className="appt-dot" />}
            </div>
            {nextSO ? (
              <>
                <p className="appt-address">{nextSO.subject}</p>
                <p className="appt-city">{t(statusLabels[nextSO.status]) || nextSO.status}</p>

                <div className="appt-meta">
                  <div className="appt-meta-item">
                    <label>{t('Criada em')}</label>
                    <span>{formatDate(nextSO.created_at)}</span>
                  </div>
                  <div className="appt-meta-item">
                    <label>{t('Prioridade')}</label>
                    <span style={{ textTransform: 'uppercase' }}>{t(nextSO.priority)}</span>
                  </div>
                  <div className="appt-meta-item">
                    <label>{t('Descrição')}</label>
                    <span>{nextSO.description || '—'}</span>
                  </div>
                  <div className="appt-meta-item">
                    <label>{t('Estimativa')}</label>
                    <span>{nextSO.budget_amount ? formatCurrency(nextSO.budget_amount) : '—'}</span>
                  </div>
                </div>

                <div className="appt-footer">
                  <span className="appt-price">
                    {nextSO.budget_amount ? formatCurrency(nextSO.budget_amount) : '—'}
                  </span>
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('Nenhuma OS pendente')}</p>
            )}
          </div>

          <div className="mini-stat">
            <div className="mini-stat-left">
              <p className="mini-stat-label">{t('Clientes')}</p>
              <p className="mini-stat-value">{customerCount}</p>
            </div>
            <div className="mini-stat-icon"><MiniStatIcon type="customers" /></div>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-left">
              <p className="mini-stat-label">{t('OS Abertas')}</p>
              <p className="mini-stat-value">{openOrdersCount}</p>
            </div>
            <div className="mini-stat-icon"><MiniStatIcon type="orders" /></div>
          </div>
        </div>

        {/* ── Column 2: Recent Orders ── */}
        <div className="card card-p" style={{ height: 'fit-content' }}>
          <div className="card-header">
            <h3 className="card-title">{t('Ordens Recentes')}</h3>
          </div>

          <div className="deals-list">
            {recentOrders.length === 0 && (
              <EmptyState icon={FileText} title={t('Nenhuma ordem de serviço encontrada')} />
            )}
            {recentOrders.map((order) => (
              <div key={order.id} className="deal-item">
                <div className="deal-thumb" style={{ fontSize: '1.25rem' }}>
                  {getEquipmentEmoji(order.subject)}
                </div>
                <div className="deal-info">
                  <p className="deal-name">{order.subject}</p>
                  <p className="deal-location">
                    {order.description?.slice(0, 50)}{order.description && order.description.length > 50 ? '...' : ''}
                  </p>
                </div>
                {order.status === 'completed' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="deal-status-badge">{t(statusLabels[order.status])}</span>
                    <ArrowRight size={14} color="var(--primary)" />
                  </div>
                ) : (
                  <div className="deal-meta">
                    {order.budget_amount != null && (
                      <p className="deal-price">{formatCurrency(order.budget_amount)}</p>
                    )}
                    <p className="deal-date">{formatDate(order.created_at)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Column 3: Right panel ── */}
        <div className="dashboard-col-right" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Customers */}
          <div className="card card-p">
            <div className="card-header">
              <h3 className="card-title">{t('Clientes')}</h3>
            </div>
            <div>
              {customers.length === 0 && (
                <EmptyState icon={Users} title={t('Nenhum cliente cadastrado')} />
              )}
              {customers.map((c) => (
                <div key={c.id} className="customer-item">
                  <div className="customer-avatar">{getInitials(c.name)}</div>
                  <div className="customer-info">
                    <p className="customer-name">{c.name}</p>
                    <p className="customer-email">{c.email || c.phone || '—'}</p>
                  </div>
                  <button className="customer-edit-btn">
                    <Edit2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="card card-p">
            <div className="card-header">
              <h3 className="card-title">{t('Financeiro')}</h3>
            </div>
            <div>
              <div className="task-item" style={{ marginBottom: 12 }}>
                <span className="task-date" style={{ color: '#22c55e', fontWeight: 600 }}>{t('Receitas')}</span>
                <div className="task-dot" style={{ background: '#22c55e' }} />
                <span className="task-text" style={{ fontWeight: 600 }}>{formatCurrency(totalIncome)}</span>
              </div>
              <div className="task-item" style={{ marginBottom: 12 }}>
                <span className="task-date" style={{ color: '#ef4444', fontWeight: 600 }}>{t('Despesas')}</span>
                <div className="task-dot" style={{ background: '#ef4444' }} />
                <span className="task-text" style={{ fontWeight: 600 }}>{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="task-item">
                <span className="task-date muted">Margem</span>
                <div className="task-dot" style={{ background: 'var(--border)' }} />
                <span className="task-text">{incomeProgress}%</span>
              </div>
            </div>
          </div>

          {/* Conversations */}
          <div className="card card-p">
            <div className="card-header">
              <h3 className="card-title">Conversas Abertas</h3>
            </div>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                {openConversations}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                conversas ativas no WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

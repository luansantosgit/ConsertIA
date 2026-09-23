import React, { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, X, ArrowUpRight, ArrowDownRight, Trash2, CalendarRange } from 'lucide-react';
import { TransactionRepository } from '@/repositories/transaction.repository';
import type { Transaction, TransactionType, TransactionStatus } from '@/types';
import { formatCurrency } from '@/lib/format';
import { SkeletonStats, SkeletonTable } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useTranslation } from '@/hooks/useTranslation';

const STATUS_BADGE: Record<string, string> = {
  completed: 'badge-success',
  pending: 'badge-warning',
  cancelled: 'badge-danger',
};

const STATUS_LABEL: Record<string, string> = {
  completed: 'Pago',
  pending: 'Pendente',
  cancelled: 'Cancelado',
};

type PeriodPreset = 'all' | 'today' | '7d' | '30d' | 'custom';

// Apenas os filtros fixos visíveis; 'all' é o estado interno (nenhum selecionado)
const PERIOD_LABELS: Record<Exclude<PeriodPreset, 'all'>, string> = {
  today: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  custom: 'Personalizado',
};

function periodRange(preset: PeriodPreset, dateFrom: string, dateTo: string): { date_from?: string; date_to?: string } {
  const now = new Date();
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  switch (preset) {
    case 'today':
      return { date_from: ymd(now), date_to: ymd(now) };
    case '7d': {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return { date_from: ymd(d), date_to: ymd(now) };
    }
    case '30d': {
      const d = new Date(now); d.setDate(d.getDate() - 29);
      return { date_from: ymd(d), date_to: ymd(now) };
    }
    case 'custom':
      return dateFrom ? { date_from: dateFrom, ...(dateTo ? { date_to: dateTo } : {}) } : {};
    default:
      return {};
  }
}

const repository = new TransactionRepository();

export const Financial: React.FC = () => {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState({ search: '', type: '' as TransactionType | '', status: '' as TransactionStatus | '' });
  const [form, setForm] = useState({ type: 'income' as TransactionType, description: '', amount: '', payment_method: '', status: 'completed' as TransactionStatus });
  const [period, setPeriod] = useState<PeriodPreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const pending = transactions
    .filter(t => t.status === 'pending' && t.type === 'income')
    .reduce((a, t) => a + t.amount, 0);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (filter.search) filters.search = filter.search;
      if (filter.type) filters.type = filter.type;
      if (filter.status) filters.status = filter.status;
      const range = periodRange(period, customFrom, customTo);
      if (range.date_from) filters.date_from = range.date_from;
      if (range.date_to) filters.date_to = range.date_to;
      const data = await repository.getAll(filters);
      setTransactions(data);
      setSelected(new Set());
    } catch (err) {
      console.error('Erro ao carregar transacoes:', err);
      setError('Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  }, [filter, period, customFrom, customTo]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    const handler = () => setShowModal(true);
    window.addEventListener('header-action-click', handler);
    return () => window.removeEventListener('header-action-click', handler);
  }, []);

  const handleSave = async () => {
    if (!form.description || !form.amount) return;
    setSaving(true);
    try {
      await repository.create({
        type: form.type,
        description: form.description,
        amount: parseFloat(form.amount),
        payment_method: form.payment_method || undefined,
        status: form.status,
      });
      setShowModal(false);
      setForm({ type: 'income', description: '', amount: '', payment_method: '', status: 'completed' });
      await fetchTransactions();
    } catch (err) {
      console.error('Erro ao salvar transacao:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
      return iso;
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = transactions.length > 0 && transactions.every(tx => selected.has(tx.id));

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(transactions.map(tx => tx.id)));
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete || confirmDelete.length === 0) return;
    setDeleting(true);
    try {
      await repository.deleteMany(confirmDelete);
      setSelected(new Set());
      setConfirmDelete(null);
      await fetchTransactions();
    } catch (err) {
      console.error('Erro ao excluir transacoes:', err);
      setError('Erro ao excluir lançamento(s)');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      {error && <ErrorMessage message={error} onRetry={() => { setError(null); fetchTransactions(); }} />}
      {!error && loading && (
        <>
          <SkeletonStats />
          <SkeletonTable />
        </>
      )}
      {!error && !loading && (
      <>
      {/* KPIs */}
      <div className="stat-cards">
        {[
          { label: t('Receita Total'), value: formatCurrency(totalIncome), change: '+14% mes', positive: true, icon: TrendingUp, color: '#10b981', bg: '#ecfdf5' },
          { label: t('Despesas Total'), value: formatCurrency(totalExpense), change: '+5% mes', positive: false, icon: TrendingDown, color: '#ef4444', bg: '#fef2f2' },
          { label: t('Saldo do Periodo'), value: formatCurrency(balance), change: balance >= 0 ? t('Positivo') : t('Negativo'), positive: balance >= 0, icon: DollarSign, color: '#4f46e5', bg: '#eef2ff' },
          { label: t('A Receber'), value: formatCurrency(pending), change: t('Pendente'), positive: false, icon: ArrowUpRight, color: '#f59e0b', bg: '#fffbeb' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{ background: s.bg }}>
                <s.icon size={20} color={s.color} />
              </div>
              <span className={`stat-card-change ${s.positive ? 'positive' : 'negative'}`}>{s.change}</span>
            </div>
            <p className="stat-card-value" style={{ color: s.color }}>{s.value}</p>
            <p className="stat-card-label">{s.label}</p>
          </div>
        ))}
      </div>

      {/* DRE Simplificado */}
      <div className="card card-p" style={{ maxWidth: 420 }}>
        <h3 className="card-title" style={{ marginBottom: 14 }}>{t('DRE Simplificado')}</h3>
        {[
          { label: t('Receita Bruta'), value: totalIncome, color: '#10b981', indent: 0 },
          { label: `(-) ${t('Despesas Totais')}`, value: -totalExpense, color: '#ef4444', indent: 0 },
          { label: t('Lucro Liquido'), value: balance, color: balance >= 0 ? '#4f46e5' : '#ef4444', indent: 0 },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: r.indent * 12 }}>{r.label}</span>
            <span style={{ fontWeight: 700, color: r.color, fontSize: '0.9375rem' }}>{formatCurrency(Math.abs(r.value))}</span>
          </div>
        ))}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: balance >= 0 ? '#10b981' : '#ef4444' }} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Margem: {totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : '0.0'}%</span>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ fontWeight: 700 }}>{t('Lancamentos')}</h3>
          {selected.size > 0 && (
            <button
              className="btn btn-danger btn-sm btn-pill"
              onClick={() => setConfirmDelete(Array.from(selected))}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Trash2 size={14} /> {t('Excluir')} ({selected.size})
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {(Object.keys(PERIOD_LABELS) as Exclude<PeriodPreset, 'all'>[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(prev => prev === p ? 'all' : p)}
              className={`btn btn-sm btn-pill ${period === p ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {p === 'custom' && <CalendarRange size={12} />}
              {t(PERIOD_LABELS[p])}
            </button>
          ))}
          {period === 'custom' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="date"
                className="input"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                title="Data inicial"
                style={{ width: 140 }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>até</span>
              <input
                type="date"
                className="input"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                title="Data final"
                style={{ width: 140 }}
              />
            </div>
          )}
          <select
            className="select"
            value={filter.type}
            onChange={e => setFilter(f => ({ ...f, type: e.target.value as TransactionType | '' }))}
            title={t('Todos os tipos')}
            style={{ width: 'auto' }}
          >
            <option value="">{t('Todos os tipos')}</option>
            <option value="income">{t('Receita')}</option>
            <option value="expense">{t('Despesa')}</option>
          </select>
          <select
            className="select"
            value={filter.status}
            onChange={e => setFilter(f => ({ ...f, status: e.target.value as TransactionStatus | '' }))}
            title={t('Todos os status')}
            style={{ width: 'auto' }}
          >
            <option value="">{t('Todos os status')}</option>
            <option value="completed">{t('Pago')}</option>
            <option value="pending">{t('Pendente')}</option>
            <option value="cancelled">{t('Cancelado')}</option>
          </select>
        </div>
        <div>
          <input
            className="input"
            placeholder={t('Buscar...')}
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {transactions.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="Nenhuma transação encontrada"
            description="Adicione seu primeiro lançamento financeiro."
            actionLabel="Novo lançamento"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 36, paddingLeft: 20 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Selecionar todos"
                  />
                </th>
                <th>{t('Descricao')}</th>
                <th>{t('Pagamento')}</th>
                <th>{t('Data')}</th>
                <th>{t('Status')}</th>
                <th style={{ textAlign: 'right' }}>{t('Valor')}</th>
                <th style={{ textAlign: 'right', paddingRight: 20, width: 60 }}>{t('Acoes')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} style={{ background: selected.has(tx.id) ? 'var(--primary-light)' : undefined }}>
                  <td style={{ paddingLeft: 20 }}>
                    <input
                      type="checkbox"
                      checked={selected.has(tx.id)}
                      onChange={() => toggleSelect(tx.id)}
                      aria-label={`Selecionar ${tx.description}`}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tx.type === 'income' ? '#ecfdf5' : '#fef2f2', flexShrink: 0 }}>
                        {tx.type === 'income' ? <ArrowUpRight size={14} color="#10b981" /> : <ArrowDownRight size={14} color="#ef4444" />}
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{tx.description}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-gray">{tx.payment_method || '—'}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{formatDate(tx.created_at)}</td>
                  <td><span className={`badge ${STATUS_BADGE[tx.status]}`}>{t(STATUS_LABEL[tx.status])}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: tx.type === 'income' ? '#10b981' : '#ef4444', fontSize: '0.9375rem' }}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: 20 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setConfirmDelete([tx.id])}
                      title={t('Excluir lançamento')}
                      aria-label={t('Excluir lançamento')}
                      style={{ padding: '2px 6px', color: 'var(--danger)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('Novo Lancamento')}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                {(['income', 'expense'] as const).map(tp => (
                  <button key={tp} onClick={() => setForm(f => ({ ...f, type: tp }))} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${form.type === tp ? (tp === 'income' ? '#10b981' : '#ef4444') : 'var(--border)'}`, background: form.type === tp ? (tp === 'income' ? '#ecfdf5' : '#fef2f2') : '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: form.type === tp ? (tp === 'income' ? '#065f46' : '#991b1b') : 'var(--text-muted)', transition: 'all 0.15s' }}>
                    {tp === 'income' ? `+ ${t('Receita')}` : `- ${t('Despesa')}`}
                  </button>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">{t('Descricao')} *</label>
                <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: OS-0124 - Servico de reparo" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('Valor')} (R$) *</label>
                  <input className="input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Pagamento')}</label>
                  <input className="input" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} placeholder="Ex: Pix, Dinheiro" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('Status')}</label>
                <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TransactionStatus }))}>
                  <option value="completed">{t('Pago')}</option>
                  <option value="pending">{t('Pendente')}</option>
                  <option value="cancelled">{t('Cancelado')}</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('Cancelar')}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Plus size={15} />{saving ? t('Salvando...') : t('Salvar')}</button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmacao de exclusao */}
      <ConfirmModal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title={confirmDelete && confirmDelete.length === 1 ? t('Excluir Lançamento') : t('Excluir Lançamentos')}
        message={
          confirmDelete && confirmDelete.length === 1
            ? 'Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.'
            : `Tem certeza que deseja excluir ${confirmDelete?.length ?? 0} lançamentos selecionados? Esta ação não pode ser desfeita.`
        }
        variant="danger"
      />
      </>
      )}
    </div>
  );
};

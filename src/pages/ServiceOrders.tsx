import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, User, Search, Printer, MessageCircle, Settings, Bell, Trash2 } from 'lucide-react';
import { SolidActionPrint, SolidActionSearch } from '@/components/SolidActionIcons';
import type { ServiceOrderStatus } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { OSModal, type OSRow } from '@/components/OSModal';
import { OSDocumentModal } from '@/components/OSDocumentModal';
import { ServiceOrderRepository } from '@/repositories/service-order.repository';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { formatOSCode, formatCurrency } from '@/lib/format';
import { loadKanbanAutoMessages, saveKanbanAutoMessages, scheduleStageAutoMessage, type KanbanAutoMessages, type StageAutoMessage } from '@/lib/os-auto-message.service';
import { SkeletonStats, SkeletonTable } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { ConfirmModal } from '@/components/ConfirmModal';
import ErrorMessage from '@/components/ErrorMessage';
import { OSAutoMessageModal } from '@/components/OSAutoMessageModal';

const STATUS_META: Record<ServiceOrderStatus, { label: string; badge: string; color: string }> = {
  pending:            { label: 'Pendente',            badge: 'badge-gray',    color: '#94a3b8' },
  diagnosis:          { label: 'Diagnóstico',          badge: 'badge-info',    color: '#3b82f6' },
  awaiting_approval:  { label: 'Ag. Aprovação',        badge: 'badge-warning', color: '#f59e0b' },
  approved:           { label: 'Aprovado',             badge: 'badge-primary', color: '#4f46e5' },
  awaiting_part:      { label: 'Ag. Peça',             badge: 'badge-danger',  color: '#ef4444' },
  in_progress:        { label: 'Em Andamento',         badge: 'badge-info',    color: '#3b82f6' },
  completed:          { label: 'Concluído',            badge: 'badge-success', color: '#10b981' },
  ready:              { label: 'Pronto p/ Retirada',   badge: 'badge-success', color: '#10b981' },
  cancelled:          { label: 'Cancelado',            badge: 'badge-gray',    color: '#94a3b8' },
};

const PRIORITY_META = {
  low:    { label: 'Baixa',    color: '#94a3b8' },
  medium: { label: 'Média',    color: '#f59e0b' },
  high:   { label: 'Alta',     color: '#ef4444' },
  urgent: { label: 'Urgente',  color: '#dc2626' },
};

const KANBAN_COLS: { key: ServiceOrderStatus; label: string }[] = [
  { key: 'pending', label: 'Pendente' },
  { key: 'diagnosis', label: 'Diagnóstico' },
  { key: 'awaiting_approval', label: 'Ag. Aprovação' },
  { key: 'in_progress', label: 'Em Andamento' },
  { key: 'awaiting_part', label: 'Ag. Peça' },
  { key: 'ready', label: 'Pronto' },
  { key: 'completed', label: 'Concluído' },
  { key: 'cancelled', label: 'Cancelado' },
];

type ViewMode = 'list' | 'kanban';

export const ServiceOrders: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [os, setOS] = useState<OSRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('list');
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewingPdfOS, setViewingPdfOS] = useState<OSRow | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [autoMessages, setAutoMessages] = useState<KanbanAutoMessages>({});
  const [configStage, setConfigStage] = useState<ServiceOrderStatus | null>(null);
  const [savingAutoMsg, setSavingAutoMsg] = useState(false);
  const [confirmDeleteOS, setConfirmDeleteOS] = useState<OSRow | null>(null);

  const handleDeleteOS = async () => {
    if (!confirmDeleteOS) return;
    try {
      const repo = new ServiceOrderRepository();
      await repo.delete(confirmDeleteOS.id);
      setOS(prev => prev.filter(o => o.id !== confirmDeleteOS.id));
    } catch (err) {
      console.error('Failed to delete service order:', err);
      setError('Erro ao excluir ordem de serviço');
    } finally {
      setConfirmDeleteOS(null);
    }
  };

  useEffect(() => {
    loadKanbanAutoMessages().then(setAutoMessages).catch(() => {});
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const repo = new ServiceOrderRepository();
      const data = await repo.getAll();
      setOS(data as OSRow[]);
    } catch (err) {
      console.error('Failed to fetch service orders:', err);
      setError('Erro ao carregar ordens de serviço');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = os.filter(o =>
    (statusFilter === 'all' || o.status === statusFilter) &&
    ((o.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
     (o.equipmentLabel || '').toLowerCase().includes(search.toLowerCase()) ||
     (o.id || '').toLowerCase().includes(search.toLowerCase()))
  );

  const handleSave = async (newOS: OSRow) => {
    try {
      const repo = new ServiceOrderRepository();
      await repo.createFromForm({
        customerId: newOS.customer_id,
        customerName: newOS.customerName,
        subject: newOS.subject,
        description: newOS.description,
        budgetAmount: newOS.budget_amount,
        priority: newOS.priority,
        checklistPhotos: newOS.checklist_photos,
      });
      await fetchOrders();
    } catch (err) {
      console.error('Failed to save service order:', err);
      setError('Erro ao salvar ordem de serviço');
    }
  };

  // Move a OS entre colunas do kanban (drag & drop)
  const handleMoveOS = async (osId: string, newStatus: ServiceOrderStatus) => {
    const current = os.find(o => o.id === osId);
    if (!current || current.status === newStatus) return;
    setMovingId(osId);
    setOS(prev => prev.map(o => o.id === osId ? { ...o, status: newStatus } : o));
    try {
      const repo = new ServiceOrderRepository();
      await repo.updateStatus(osId, newStatus);
      // Agenda mensagem automatica do estagio via fila no banco (10s)
      void scheduleStageAutoMessage(
        {
          conversationId: current.conversationId,
          customerPhone: current.customerPhone,
          customerName: current.customerName,
          customerId: current.customer_id,
        },
        autoMessages[newStatus],
      );
    } catch (err) {
      console.error('Failed to move service order:', err);
      setOS(prev => prev.map(o => o.id === osId ? { ...o, status: current.status } : o));
      setError('Erro ao mover ordem de serviço');
    } finally {
      setMovingId(null);
    }
  };

  // Abre o chat direto com o lead da OS (cria conversa se ainda nao existir)
  const handleOpenChat = async (o: OSRow) => {
    try {
      let convId = o.conversationId;
      if (!convId && o.customerPhone) {
        const convRepo = new ConversationRepository();
        const existing = await convRepo.getByContactPhone(o.customerPhone);
        if (existing) {
          convId = existing.id;
        } else {
          const created = await convRepo.create({
            contact_phone: o.customerPhone,
            contact_name: o.customerName,
            customer_id: o.customer_id,
            status: 'open',
            unread_count: 0,
            last_message_at: new Date().toISOString(),
          });
          convId = created.id;
        }
      }
      if (convId) {
        navigate(`/atendimento?conversationId=${convId}`);
      } else {
        setError('Cliente sem telefone/WhatsApp cadastrado para abrir o chat');
      }
    } catch (err) {
      console.error('Failed to open chat:', err);
      setError('Erro ao abrir o chat do cliente');
    }
  };

  // Salva a mensagem automatica de um estagio do kanban
  const handleSaveAutoMessage = async (stage: ServiceOrderStatus, cfg: StageAutoMessage) => {
    setSavingAutoMsg(true);
    try {
      const next = { ...autoMessages, [stage]: cfg };
      await saveKanbanAutoMessages(next);
      setAutoMessages(next);
      setConfigStage(null);
    } catch (err) {
      console.error('Failed to save auto message:', err);
      setError('Erro ao salvar mensagem automática');
    } finally {
      setSavingAutoMsg(false);
    }
  };

  React.useEffect(() => {
    const handler = () => setShowModal(true);
    window.addEventListener('header-action-click', handler);
    return () => window.removeEventListener('header-action-click', handler);
  }, []);

  return (
    <div className="page">
      {error && <ErrorMessage message={error} onRetry={() => { setError(null); fetchOrders(); }} />}
      {!error && loading && (
        <>
          <SkeletonStats />
          <SkeletonTable />
        </>
      )}
      {!error && !loading && (
      <>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
            {(['list', 'kanban'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500,
                background: view === v ? '#fff' : 'transparent',
                color: view === v ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}>
                {v === 'list' ? `≡ ${t('Lista')}` : `⊞ ${t('Kanban')}`}
              </button>
            ))}
          </div>

          {/* Status filter pills */}
          {['all', 'pending', 'in_progress', 'awaiting_approval', 'ready'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`btn btn-sm btn-pill ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}>
              {s === 'all' ? t('Todas') : t(STATUS_META[s as ServiceOrderStatus]?.label)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-wrap" style={{ minWidth: 260 }}>
            <SolidActionSearch size={14} style={{ flexShrink: 0 }} />
            <input placeholder={t('Buscar OS por cliente, aparelho...')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {(() => {
        const wonValue = os
          .filter(o => ['completed', 'ready'].includes(o.status))
          .reduce((a, o) => a + (o.budget_amount || 0), 0);
        const lostValue = os
          .filter(o => o.status === 'cancelled')
          .reduce((a, o) => a + (o.budget_amount || 0), 0);
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { label: t('Total abertas'), value: os.filter(o => !['completed','cancelled'].includes(o.status)).length, color: '#4f46e5', bg: '#eef2ff' },
              { label: t('Em andamento'), value: os.filter(o => o.status === 'in_progress').length, color: '#3b82f6', bg: '#eff6ff' },
              { label: t('Ag. aprovação'), value: os.filter(o => o.status === 'awaiting_approval').length, color: '#f59e0b', bg: '#fffbeb' },
              { label: t('Prontas'), value: os.filter(o => o.status === 'ready').length, color: '#10b981', bg: '#ecfdf5' },
              { label: t('Valor fechado'), value: formatCurrency(wonValue), color: '#10b981', bg: '#ecfdf5' },
              { label: t('Valor perdido'), value: formatCurrency(lostValue), color: '#ef4444', bg: '#fef2f2' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', boxShadow: 'var(--card-shadow)' }}>
                <p style={{ fontSize: s.value.toString().startsWith('R$') ? '1.375rem' : '1.75rem', fontWeight: 800, color: s.color }}>{s.value}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>{t('N° OS')}</th>
                <th>{t('Cliente')}</th>
                <th>{t('Equipamento')}</th>
                <th>{t('Problema')}</th>
                <th>{t('Técnico')}</th>
                <th>{t('Prioridade')}</th>
                <th>{t('Status')}</th>
                <th>{t('Valor')}</th>
                <th style={{ textAlign: 'right', paddingRight: 20 }}>{t('Ações')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const sm = STATUS_META[o.status];
                const pm = PRIORITY_META[o.priority];
                return (
                  <tr key={o.id}>
                    <td style={{ paddingLeft: 20, fontWeight: 700, color: 'var(--primary)', fontSize: '0.8125rem' }}>{formatOSCode(o.id)}</td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.6875rem', flexShrink: 0 }}>
                          {o.contactAvatar
                            ? <img src={o.contactAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (o.customerName || '?').charAt(0).toUpperCase()}
                        </div>
                        {o.customerName || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{o.equipmentLabel || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 180 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{o.subject}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{o.technicianName || '—'}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, color: pm.color }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: pm.color }} />
                        {t(pm.label)}
                      </span>
                    </td>
                    <td><span className={`badge ${sm.badge}`}>{t(sm.label)}</span></td>
                    <td style={{ fontWeight: 600 }}>
                      {o.budget_amount ? formatCurrency(o.budget_amount) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 20, whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', color: 'var(--primary)' }}
                        onClick={() => handleOpenChat(o)}
                        title="Conversar no chat com o cliente"
                      >
                        <MessageCircle size={13} /> Chat
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ gap: 6, marginLeft: 6 }}
                        onClick={() => setViewingPdfOS(o)}
                        title="Visualizar e Imprimir PDF"
                      >
                        <SolidActionPrint size={14} /> PDF
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', marginLeft: 6, color: 'var(--danger)' }}
                        onClick={() => setConfirmDeleteOS(o)}
                        title="Excluir OS"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState
              icon={Search}
              title={t('Nenhuma OS encontrada')}
              actionLabel={t('Nova OS')}
              onAction={() => setShowModal(true)}
            />
          )}
        </div>
      )}

      {/* KANBAN VIEW */}
      {view === 'kanban' && (
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
          {KANBAN_COLS.map(col => {
            const colOS = os.filter(o => o.status === col.key);
            const meta = STATUS_META[col.key];
            return (
              <div
                key={col.key}
                onDragOver={e => { e.preventDefault(); setDragOverCol(col.key); }}
                onDragLeave={() => setDragOverCol(prev => prev === col.key ? null : prev)}
                onDrop={e => {
                  e.preventDefault();
                  const osId = e.dataTransfer.getData('text/os-id');
                  setDragOverCol(null);
                  if (osId) handleMoveOS(osId, col.key);
                }}
                style={{
                  minWidth: 240,
                  flex: '0 0 240px',
                  borderRadius: 12,
                  transition: 'background 0.15s, box-shadow 0.15s',
                  background: dragOverCol === col.key ? 'var(--primary-light)' : 'transparent',
                  boxShadow: dragOverCol === col.key ? 'inset 0 0 0 2px var(--primary)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: dragOverCol === col.key ? '0 4px' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t(col.label)}</span>
                    {autoMessages[col.key]?.enabled && (
                      <span title="Mensagem automática ativa"><Bell size={11} color="#10b981" /></span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => setConfigStage(col.key)}
                      title="Configurar mensagem automática"
                      aria-label="Configurar mensagem automática"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 3,
                        borderRadius: 6, color: autoMessages[col.key]?.enabled ? 'var(--primary)' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = autoMessages[col.key]?.enabled ? 'var(--primary)' : 'var(--text-muted)')}
                    >
                      <Settings size={13} />
                    </button>
                    <span style={{ background: '#f1f5f9', borderRadius: 99, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{colOS.length}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {colOS.map(o => (
                    <div
                      key={o.id}
                      draggable
                      onDragStart={e => { e.dataTransfer.setData('text/os-id', o.id); e.dataTransfer.effectAllowed = 'move'; }}
                      style={{
                        background: '#fff',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '14px',
                        boxShadow: 'var(--card-shadow)',
                        cursor: 'grab',
                        opacity: movingId === o.id ? 0.5 : 1,
                        transition: 'opacity 0.15s, transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--card-shadow)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{formatOSCode(o.id)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.6875rem', fontWeight: 600, color: PRIORITY_META[o.priority].color }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: PRIORITY_META[o.priority].color }} />
                          {t(PRIORITY_META[o.priority].label)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                          {o.contactAvatar
                            ? <img src={o.contactAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (o.customerName || '?').charAt(0).toUpperCase()}
                        </div>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customerName || '—'}</p>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 10 }}>{(o.equipmentLabel || '—')} · {o.subject}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={11} />{o.technicianName || '—'}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 6px', fontSize: '0.75rem', color: 'var(--primary)' }}
                            onClick={() => handleOpenChat(o)}
                            title="Conversar no chat com o cliente"
                          >
                            <MessageCircle size={12} /> Chat
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 6px', fontSize: '0.75rem', color: 'var(--primary)' }}
                            onClick={() => setViewingPdfOS(o)}
                          >
                            <Printer size={12} /> PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '2px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.8125rem', cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                    <Plus size={14} />{t('Nova OS')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <OSModal onClose={() => setShowModal(false)} onSave={handleSave} />}

      <OSAutoMessageModal
        isOpen={configStage !== null}
        stageLabel={configStage ? STATUS_META[configStage].label : ''}
        initial={configStage ? autoMessages[configStage] || { enabled: false, message: '' } : { enabled: false, message: '' }}
        saving={savingAutoMsg}
        onSave={cfg => { if (configStage) handleSaveAutoMessage(configStage, cfg); }}
        onClose={() => setConfigStage(null)}
      />

      {viewingPdfOS && (
        <OSDocumentModal
          os={viewingPdfOS}
          onClose={() => setViewingPdfOS(null)}
        />
      )}

      <ConfirmModal
        isOpen={confirmDeleteOS !== null}
        onClose={() => setConfirmDeleteOS(null)}
        onConfirm={handleDeleteOS}
        title="Excluir OS"
        message={`Tem certeza que deseja excluir a OS de "${confirmDeleteOS?.customerName || 'cliente'}" (${confirmDeleteOS?.subject})? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
      />
      </>
      )}
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Zap, FileText } from 'lucide-react';
import { SkeletonCard } from '@/components/Skeleton';
import ErrorMessage from '@/components/ErrorMessage';
import { ConfirmModal } from '@/components/ConfirmModal';
import { QuickReplyRepository, type QuickReply, type QuickReplyPart } from '@/repositories/quick-reply.repository';
import { useTranslation } from '@/hooks/useTranslation';
import { QuickReplyEditor } from './QuickReplyEditor';

const repo = new QuickReplyRepository();

export const QuickRepliesSection: React.FC = () => {
  const { t } = useTranslation();
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReplies(await repo.getAll());
    } catch {
      setError('Erro ao carregar respostas rápidas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async () => {
    if (!deleteId) return;
    try {
      await repo.delete(deleteId);
      await load();
    } catch {
      setError('Erro ao excluir resposta rápida');
    } finally {
      setDeleteId(null);
    }
  };

  const closeEditor = () => { setEditing(null); setCreating(false); };

  const onSaved = async () => { closeEditor(); await load(); };

  if (loading) return <SkeletonCard />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 4px' }}>{t('Respostas Rápidas')}</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Mensagens prontas para usar no chat digitando <strong>/</strong>. Componha
            sequências: cada parte é enviada com 1,5s de intervalo.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setCreating(true); }}>
          <Plus size={15} /> Nova resposta
        </button>
      </div>

      {replies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Zap size={24} /></div>
          <p className="empty-state-title">Nenhuma resposta rápida</p>
          <p className="empty-state-desc">Crie respostas prontas para agilizar o atendimento.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {replies.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'var(--primary-light)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FileText size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  /{r.shortcut}
                  {r.parts.length > 1 && (
                    <span className="badge badge-primary" title="Sequência com cadência">{r.parts.length} partes</span>
                  )}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.parts.map(p => p.type === 'text' ? p.text : (p.caption || '📷 Mídia')).join(' → ').slice(0, 90)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(r)} title={t('Editar')}>
                  <Pencil size={14} />
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setDeleteId(r.id)}
                  title={t('Excluir')}
                  style={{ color: 'var(--danger)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <QuickReplyEditor
          reply={editing}
          onClose={closeEditor}
          onSaved={onSaved}
        />
      )}

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Excluir resposta rápida"
        message="Tem certeza? Esta resposta não aparecerá mais no chat."
        variant="danger"
        onConfirm={remove}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
};

export type { QuickReplyPart };

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X, RefreshCw, GraduationCap, Plus } from 'lucide-react';
import { useTraining } from '@/superadmin/training/useTraining';
import { TrainingFormModal } from '@/superadmin/training/TrainingFormModal';
import { TrainingListRow } from '@/superadmin/training/TrainingListRow';
import { ConfirmModal } from '@/components/ConfirmModal';
import EmptyState from '@/components/EmptyState';
import { SkeletonLine } from '@/components/Skeleton';
import { filterVideos } from '@/lib/training-filter';
import type { TrainingVideo } from '@/types';

/** Painel superadmin: busca, reordenação por drag & drop e CRUD dos vídeos. */
export const SuperAdminTreinamento: React.FC = () => {
  const { videos, loading, saving, reload, save, remove, reorder } = useTraining();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingVideo | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<TrainingVideo | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => { reload(); }, [reload]);

  const visible = useMemo(() => filterVideos(videos, search), [videos, search]);
  const searching = search.trim().length > 0;

  const submit = useCallback(async (input: Parameters<typeof save>[0], id?: string, old?: TrainingVideo) => {
    const ok = await save(input, id, old);
    setFeedback(ok ? (id ? 'Vídeo atualizado ✓' : 'Vídeo publicado ✓') : 'Erro ao salvar vídeo');
    return ok;
  }, [save]);

  const handleDrop = async (targetId: string, sourceId: string) => {
    const source = sourceId || dragId;
    setDragId(null);
    setOverId(null);
    if (!source || source === targetId) return;
    await reorder(source, targetId);
    setFeedback('Ordem atualizada ✓');
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      await remove(confirmTarget);
      setConfirmTarget(null);
      setFeedback('Vídeo excluído ✓');
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Treinamento</h2>
          <p className="page-subtitle">Vídeos que todos os usuários veem em /treinamento</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ minWidth: 220 }}>
            <Search size={15} style={{ flexShrink: 0 }} />
            <input
              placeholder="Buscar vídeos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar vídeos"
            />
            {searching && (
              <button className="btn btn-ghost" aria-label="Limpar busca" onClick={() => setSearch('')} style={{ padding: 4, borderRadius: '50%' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={reload} title="Atualizar">
            <RefreshCw size={14} /> Atualizar
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={14} /> Novo vídeo
          </button>
        </div>
      </div>

      {feedback && <p style={{ margin: '0 0 12px', fontSize: '0.8125rem', color: 'var(--success)' }}>{feedback}</p>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => <SkeletonLine key={i} width="100%" height={78} />)}
        </div>
      ) : videos.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Nenhum vídeo publicado"
          description="Publique o primeiro treinamento: link do YouTube ou upload do arquivo."
          actionLabel="Novo vídeo"
          onAction={() => { setEditing(null); setFormOpen(true); }}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum vídeo encontrado"
          description={`Nada para "${search.trim()}". Tente outro termo.`}
          actionLabel="Limpar busca"
          onAction={() => setSearch('')}
        />
      ) : (
        <>
          <p style={{ margin: '0 0 10px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {visible.length} vídeo(s) · {new Set(videos.map((v) => v.topic)).size} tópico(s) · arraste para reordenar
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visible.map((v) => (
              <TrainingListRow
                key={v.id}
                video={v}
                dragging={dragId === v.id}
                over={overId === v.id && dragId !== v.id}
                onEdit={(video) => { setEditing(video); setFormOpen(true); }}
                onDelete={setConfirmTarget}
                onDragStart={setDragId}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                onDragOver={setOverId}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </>
      )}

      <TrainingFormModal
        isOpen={formOpen}
        video={editing}
        topics={videos.map((v) => v.topic)}
        onSubmit={submit}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmModal
        isOpen={!!confirmTarget}
        loading={confirmLoading || saving}
        title="Excluir vídeo"
        message={`Excluir "${confirmTarget?.title}" do portal de treinamento? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

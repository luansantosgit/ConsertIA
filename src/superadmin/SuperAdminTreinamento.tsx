import React, { useCallback, useEffect, useState } from 'react';
import { Edit, Trash2, Plus, RefreshCw, GraduationCap } from 'lucide-react';
import { useTraining } from '@/superadmin/training/useTraining';
import { TrainingFormModal } from '@/superadmin/training/TrainingFormModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import EmptyState from '@/components/EmptyState';
import { SkeletonLine } from '@/components/Skeleton';
import { detectVideoSource, parseYouTubeId, youtubeThumbUrl } from '@/lib/training-video';
import type { TrainingVideo } from '@/types';

const Thumb: React.FC<{ video: TrainingVideo }> = ({ video }) => {
  const id = detectVideoSource(video.url) === 'youtube' ? parseYouTubeId(video.url) : null;
  return (
    <div style={{ width: 96, height: 54, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, var(--primary), #8b5cf6)' }}>
      {video.thumbnail_url ? (
        <img src={video.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : id ? (
        <img src={youtubeThumbUrl(id)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : null}
    </div>
  );
};

const Row: React.FC<{ video: TrainingVideo; onEdit: (v: TrainingVideo) => void; onDelete: (v: TrainingVideo) => void }> =
({ video, onEdit, onDelete }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12 }}>
    <Thumb video={video} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{video.title}</span>
        <span className="badge badge-secondary">{video.topic}</span>
        {!video.active && <span className="badge badge-danger">Inativo</span>}
      </div>
      <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {video.description || (video.source === 'youtube' ? 'YouTube' : 'Arquivo do Storage')} · ordem {video.sort_order}
      </p>
    </div>
    <div style={{ display: 'flex', gap: 6 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => onEdit(video)} title="Editar"><Edit size={15} /></button>
      <button className="btn btn-ghost btn-sm" onClick={() => onDelete(video)} title="Excluir" style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
    </div>
  </div>
);

/** Painel superadmin: CRUD dos vídeos do portal de treinamento. */
export const SuperAdminTreinamento: React.FC = () => {
  const { videos, loading, saving, reload, save, remove } = useTraining();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingVideo | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<TrainingVideo | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => { reload(); }, [reload]);

  const submit = useCallback(async (input: Parameters<typeof save>[0], id?: string, old?: TrainingVideo) => {
    const ok = await save(input, id, old);
    setFeedback(ok ? (id ? 'Vídeo atualizado ✓' : 'Vídeo publicado ✓') : 'Erro ao salvar vídeo');
    return ok;
  }, [save]);

  const topics = videos.map((v) => v.topic);

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
        <div style={{ display: 'flex', gap: 10 }}>
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
      ) : (
        <>
          <p style={{ margin: '0 0 10px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {videos.length} vídeo(s) · {new Set(topics).size} tópico(s)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {videos.map((v) => <Row key={v.id} video={v} onEdit={(video) => { setEditing(video); setFormOpen(true); }} onDelete={setConfirmTarget} />)}
          </div>
        </>
      )}

      <TrainingFormModal
        isOpen={formOpen}
        video={editing}
        topics={topics}
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

import React from 'react';
import { Edit, GripVertical, Trash2 } from 'lucide-react';
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

interface RowProps {
  video: TrainingVideo;
  dragging: boolean;
  over: boolean;
  onEdit: (video: TrainingVideo) => void;
  onDelete: (video: TrainingVideo) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (id: string) => void;
  onDrop: (targetId: string, sourceId: string) => void;
}

/** Linha da lista: arrastável (reordena) com ações de editar/excluir. */
export const TrainingListRow: React.FC<RowProps> = ({
  video, dragging, over, onEdit, onDelete, onDragStart, onDragEnd, onDragOver, onDrop,
}) => (
  <div
    className="card"
    draggable
    onDragStart={(e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', video.id);
      onDragStart(video.id);
    }}
    onDragEnd={onDragEnd}
    onDragOver={(e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      onDragOver(video.id);
    }}
    onDrop={(e) => {
      e.preventDefault();
      // O id de origem vem do dataTransfer (padrão DnD) — não depende do estado
      onDrop(video.id, e.dataTransfer.getData('text/plain'));
    }}
    style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: 12,
      opacity: dragging ? 0.45 : 1,
      borderColor: over ? 'var(--primary)' : undefined,
      boxShadow: over ? '0 0 0 2px var(--primary-ring)' : undefined,
      cursor: 'grab',
      transition: 'opacity 0.15s, box-shadow 0.15s, border-color 0.15s',
    }}
  >
    <span title="Arraste para reordenar" style={{ display: 'flex', color: 'var(--text-muted)', flexShrink: 0 }}>
      <GripVertical size={16} />
    </span>
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

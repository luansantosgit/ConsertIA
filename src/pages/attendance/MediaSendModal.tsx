import React, { useState, useEffect } from 'react';
import { X, Send, FileText, Music, Trash2, ImageIcon } from 'lucide-react';

interface MediaSendModalProps {
  isOpen: boolean;
  files: File[];
  onSend: (files: File[], caption?: string) => void;
  onClose: () => void;
}

function previewFor(file: File): { url: string; kind: 'image' | 'video' | 'other' } {
  if (file.type.startsWith('image/')) return { url: URL.createObjectURL(file), kind: 'image' };
  if (file.type.startsWith('video/')) return { url: URL.createObjectURL(file), kind: 'video' };
  return { url: '', kind: 'other' };
}

export const MediaSendModal: React.FC<MediaSendModalProps> = ({
  isOpen,
  files,
  onSend,
  onClose,
}) => {
  const [working, setWorking] = useState<File[]>([]);
  const [caption, setCaption] = useState('');

  useEffect(() => {
    if (isOpen) {
      setWorking(files);
      setCaption('');
    }
  }, [isOpen, files]);

  if (!isOpen || working.length === 0) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 className="modal-title">
            Enviar {working.length} {working.length === 1 ? 'arquivo' : 'arquivos'}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10, maxHeight: 280, overflowY: 'auto', padding: 2 }}>
            {working.map((file, i) => {
              const preview = previewFor(file);
              return (
                <div key={`${file.name}-${i}`} style={{
                  position: 'relative',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#f8fafc',
                  aspectRatio: '1 / 1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <MediaThumb file={file} preview={preview} />
                  <button
                    onClick={() => setWorking(prev => prev.filter((_, idx) => idx !== i))}
                    title="Remover"
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(15,23,42,0.7)', color: '#fff',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                  <span style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    fontSize: '0.5625rem', color: '#fff',
                    background: 'rgba(15,23,42,0.6)',
                    padding: '2px 6px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {file.name}
                  </span>
                </div>
              );
            })}
          </div>

          <input
            className="input"
            placeholder="Legenda (opcional — aplicada a todos)"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            style={{ fontSize: '0.8125rem' }}
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={() => onSend(working, caption.trim() || undefined)}
            disabled={working.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Send size={14} /> Enviar {working.length > 0 ? `(${working.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

const MediaThumb: React.FC<{ file: File; preview: { url: string; kind: 'image' | 'video' | 'other' } }> = ({ file, preview }) => {
  if (preview.kind === 'image') {
    return <img src={preview.url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  }
  if (preview.kind === 'video') {
    return <video src={preview.url} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  }
  const icon = file.type.startsWith('audio/')
    ? <Music size={28} color="var(--text-muted)" />
    : file.type.startsWith('image/')
      ? <ImageIcon size={28} color="var(--text-muted)" />
      : <FileText size={28} color="var(--text-muted)" />;
  return icon;
};

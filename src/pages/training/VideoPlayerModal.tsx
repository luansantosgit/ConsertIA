import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import type { TrainingVideo } from '@/types';
import { detectVideoSource, parseYouTubeId, youtubeEmbedUrl } from '@/lib/training-video';

interface VideoPlayerModalProps {
  video: TrainingVideo | null;
  onClose: () => void;
}

/** Player em modal: arquivo do Storage ou embed do YouTube. */
export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
  const { t } = useTranslation();
  // Esc fecha o player
  useEffect(() => {
    if (!video) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [video, onClose]);

  if (!video) return null;
  const youtubeId = detectVideoSource(video.url) === 'youtube' ? parseYouTubeId(video.url) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, padding: 0, overflow: 'hidden' }}>
        <div className="modal-header" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <h3 className="modal-title" style={{ fontSize: '1rem' }}>{video.title}</h3>
            <span className="badge badge-secondary" style={{ alignSelf: 'flex-start' }}>{video.topic}</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('Fechar')}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body" style={{ padding: 0 }}>
          {youtubeId ? (
            <iframe
              src={youtubeEmbedUrl(youtubeId)}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', aspectRatio: '16 / 9', border: 0, display: 'block' }}
            />
          ) : (
            <video
              src={video.url}
              controls
              autoPlay
              playsInline
              style={{ width: '100%', aspectRatio: '16 / 9', display: 'block', background: '#000' }}
            />
          )}
          {video.description && (
            <p style={{ padding: '12px 16px', margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {video.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Play } from 'lucide-react';
import type { TrainingVideo } from '@/types';

interface VideoCardProps {
  video: TrainingVideo;
  onOpen: (video: TrainingVideo) => void;
}

/** Card de vídeo (thumb 16:9 + play + título) usado nas linhas e na busca. */
export const VideoCard: React.FC<VideoCardProps> = ({ video, onOpen }) => (
  <button
    className="card"
    onClick={() => onOpen(video)}
    style={{
      width: 218, flexShrink: 0, padding: 0, overflow: 'hidden', cursor: 'pointer',
      textAlign: 'left', border: '1px solid var(--border)', background: 'var(--card-bg)',
      transition: 'transform 0.15s, border-color 0.15s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
    aria-label={video.title}
  >
    <div style={{ aspectRatio: '16 / 9', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', position: 'relative' }}>
      {video.thumbnail_url && (
        <img
          src={video.thumbnail_url}
          alt=""
          loading="lazy"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      <span style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.25)',
      }}>
        <span style={{
          width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
        }}>
          <Play size={18} fill="currentColor" />
        </span>
      </span>
    </div>
    <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{
        fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {video.title}
      </span>
      {video.description && (
        <span style={{
          fontSize: '0.75rem', color: 'var(--text-muted)',
          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {video.description}
        </span>
      )}
    </div>
  </button>
);

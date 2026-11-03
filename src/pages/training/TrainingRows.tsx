import React from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import type { TrainingVideo } from '@/types';
import { VideoCard } from './VideoCard';

interface RowProps {
  topic: string;
  videos: TrainingVideo[];
  onOpen: (video: TrainingVideo) => void;
}

/** Linha estilo Netflix: título do tópico + carrossel com setas. */
const Row: React.FC<RowProps> = ({ topic, videos, onOpen }) => {
  const { t } = useTranslation();
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  const scroll = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * 480, behavior: 'smooth' });
  };

  return (
    <section>
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
        {topic}
      </h3>
      <div style={{ position: 'relative' }}>
        <div
          ref={scrollerRef}
          className="training-row"
          style={{
            display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x proximity',
            paddingBottom: 4, scrollPaddingLeft: 0, scrollbarWidth: 'thin',
          }}
        >
          {videos.map((video) => (
            <div key={video.id} style={{ scrollSnapAlign: 'start' }}>
              <VideoCard video={video} onOpen={onOpen} />
            </div>
          ))}
        </div>
        <button
          className="btn btn-ghost"
          aria-label={t('Ver anteriores')}
          onClick={() => scroll(-1)}
          style={{ position: 'absolute', left: -14, top: 56, padding: 6, borderRadius: '50%', background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          className="btn btn-ghost"
          aria-label={t('Ver próximos')}
          onClick={() => scroll(1)}
          style={{ position: 'absolute', right: -14, top: 56, padding: 6, borderRadius: '50%', background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
};

interface TrainingRowsProps {
  groups: Array<[string, TrainingVideo[]]>;
  onOpen: (video: TrainingVideo) => void;
}

export const TrainingRows: React.FC<TrainingRowsProps> = ({ groups, onOpen }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
    {groups.map(([topic, videos]) => (
      <Row key={topic} topic={topic} videos={videos} onOpen={onOpen} />
    ))}
  </div>
);

/** Hero em destaque: o primeiro vídeo da ordem, como “em cartaz”. */
export const TrainingHero: React.FC<{ video: TrainingVideo; onOpen: (v: TrainingVideo) => void }> = ({ video, onOpen }) => {
  const { t } = useTranslation();
  return (
    <button
      className="card"
      onClick={() => onOpen(video)}
      style={{
        padding: 0, overflow: 'hidden', cursor: 'pointer', textAlign: 'left',
        border: '1px solid var(--border)', background: 'var(--card-bg, #fff)',
      }}
      aria-label={`${t('Assistir')}: ${video.title}`}
    >
    <div style={{ position: 'relative', minHeight: 220, background: 'linear-gradient(135deg, var(--primary), #8b5cf6)' }}>
      {video.thumbnail_url && (
        <img
          src={video.thumbnail_url}
          alt=""
          loading="lazy"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.25) 70%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10,
        padding: '28px 32px', maxWidth: 640,
      }}>
        <span className="badge badge-primary" style={{ alignSelf: 'flex-start' }}>{t('Em destaque')}</span>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
          {video.title}
        </h2>
        {video.description && (
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', margin: 0 }}>
            {video.description}
          </p>
        )}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
          background: '#fff', color: 'var(--primary)', fontWeight: 700, fontSize: '0.875rem',
          padding: '9px 18px', borderRadius: 10, marginTop: 6,
        }}>
          <Play size={15} fill="currentColor" /> {t('Assistir')}
        </span>
      </div>
    </div>
  </button>
  );
};

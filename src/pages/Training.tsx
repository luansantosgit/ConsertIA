import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { SkeletonLine } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';
import type { TrainingVideo } from '@/types';
import { filterVideos, groupByTopic } from '@/lib/training-filter';
import { useTrainingVideos } from './training/useTrainingVideos';
import { TrainingHero, TrainingRows } from './training/TrainingRows';
import { VideoCard } from './training/VideoCard';
import { VideoPlayerModal } from './training/VideoPlayerModal';

/** Skeleton enquanto a lista carrega (hero + duas linhas de cards). */
const TrainingSkeleton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <SkeletonLine width="100%" height={200} />
    <SkeletonLine width={180} height={16} />
    <div style={{ display: 'flex', gap: 12, overflow: 'hidden' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonLine key={i} width={218} height={150} />
      ))}
    </div>
  </div>
);

/** Portal de treinamento estilo Netflix — livre para todos os cargos. */
export default function Training() {
  const { t } = useTranslation();
  const { videos, loading, error, reload } = useTrainingVideos();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<TrainingVideo | null>(null);

  const results = useMemo(() => filterVideos(videos, query), [videos, query]);
  const groups = useMemo(() => groupByTopic(results), [results]);
  const topics = useMemo(
    () => Array.from(new Set(videos.map((v) => v.topic || 'Geral'))),
    [videos],
  );
  const searching = query.trim().length > 0;
  const open = (v: TrainingVideo) => setSelected(v);

  return (
    <div className="page">
      <div className="page-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 14 }}>
        <div>
          <h2 className="page-title">{t('Treinamento')}</h2>
          <p className="page-subtitle">{t('Aprenda a usar a plataforma com vídeos curtos')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 220, maxWidth: 420 }}>
            <Search size={15} style={{ flexShrink: 0 }} />
            <input
              placeholder={t('Buscar treinamentos...')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t('Treinamento')}
            />
            {searching && (
              <button
                className="btn btn-ghost"
                aria-label={t('Limpar busca')}
                onClick={() => setQuery('')}
                style={{ padding: 4, borderRadius: '50%' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          {!searching && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {topics.map((topic) => (
                <button
                  key={topic}
                  className="btn btn-sm btn-pill btn-secondary"
                  onClick={() => setQuery(topic)}
                  title={topic}
                >
                  {topic}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && <TrainingSkeleton />}

      {!loading && error && (
        <ErrorMessage message={t('Erro ao carregar treinamentos')} onRetry={reload} />
      )}

      {!loading && !error && videos.length === 0 && (
        <EmptyState
          icon={Search}
          title={t('Nenhum treinamento disponível')}
          description={t('Os vídeos aparecem aqui quando o administrador publica treinamentos.')}
        />
      )}

      {!loading && !error && videos.length > 0 && results.length === 0 && (
        <EmptyState
          icon={Search}
          title={t('Nenhum resultado para a busca')}
          description={t('Tente outro termo ou veja por tópico.')}
          actionLabel={t('Limpar busca')}
          onAction={() => setQuery('')}
        />
      )}

      {!loading && !error && results.length > 0 && searching && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {results.map((video) => (
            <VideoCard key={video.id} video={video} onOpen={open} />
          ))}
        </div>
      )}

      {!loading && !error && !searching && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {groups.length > 0 && <TrainingHero video={groups[0][1][0]} onOpen={open} />}
          <TrainingRows groups={groups} onOpen={open} />
        </div>
      )}

      <VideoPlayerModal video={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { TrainingVideoRepository } from '@/repositories/training-video.repository';
import type { TrainingVideo } from '@/types';

const repo = new TrainingVideoRepository();

/** Carrega os vídeos ativos do portal de treinamento (com retry). */
export function useTrainingVideos() {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    repo.getActive()
      .then(setVideos)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  // Carga inicial ao montar
  useEffect(() => { load(); }, []);

  return { videos, loading, error, reload: load };
}

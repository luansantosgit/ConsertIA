import { useEffect, useState } from 'react';
import { TrainingVideoRepository } from '@/repositories/training-video.repository';

const repo = new TrainingVideoRepository();

export interface TrainingContentState {
  /** Existe pelo menos um vídeo ativo publicado? */
  hasContent: boolean;
  /** Consulta em andamento (evita "piscar" o ícone sem conteúdo). */
  loading: boolean;
}

/**
 * Verifica se o portal de treinamento tem conteúdo publicado.
 * O ícone de tutorial no header só aparece quando há vídeo ativo.
 */
export function useTrainingContent(): TrainingContentState {
  const [hasContent, setHasContent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    repo
      .hasContent()
      .then((value) => {
        if (!alive) return;
        setHasContent(value);
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { hasContent, loading };
}

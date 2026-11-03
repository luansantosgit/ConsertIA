import { useCallback, useState } from 'react';
import { TrainingVideoRepository, type TrainingVideoInput } from '@/repositories/training-video.repository';
import { removeTrainingFile } from '@/lib/training-upload';
import { reorderById, sortOrdersFor, sortVideos } from '@/superadmin/training/reorder';
import type { TrainingVideo } from '@/types';

const repo = new TrainingVideoRepository();

/** CRUD de vídeos do treinamento (painel superadmin). */
export function useTraining() {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVideos(sortVideos(await repo.getAll()));
    } finally {
      setLoading(false);
    }
  }, []);

  /** Cria ou atualiza; `old` limpa arquivos órfãos do Storage. */
  const save = async (input: TrainingVideoInput, id?: string, old?: TrainingVideo) => {
    setSaving(true);
    try {
      if (id) {
        await repo.update(id, input);
        if (old) {
          if (old.url !== input.url) await removeTrainingFile(old.url);
          if (old.thumbnail_url && old.thumbnail_url !== input.thumbnail_url) {
            await removeTrainingFile(old.thumbnail_url);
          }
        }
      } else {
        await repo.create(input);
      }
      await load();
      return true;
    } finally {
      setSaving(false);
    }
  };

  /** Exclui o registro e, melhor-esforço, arquivos vinculados no Storage. */
  const remove = async (video: TrainingVideo) => {
    await repo.delete(video.id);
    await removeTrainingFile(video.url);
    await removeTrainingFile(video.thumbnail_url);
    await load();
  };

  /** Reordena por drag & drop: move `fromId` para a posição de `toId`. */
  const reorder = async (fromId: string, toId: string) => {
    const next = reorderById(videos, fromId, toId);
    if (next === videos) return;
    setVideos(next);
    await repo.reorder(sortOrdersFor(next));
    await load();
  };

  return { videos, loading, saving, reload: load, save, remove, reorder };
}

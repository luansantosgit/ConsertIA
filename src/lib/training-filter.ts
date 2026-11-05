import type { TrainingVideo } from '@/types';

/** Busca por título, descrição e tópico (sem acento/case). */
export function normalizeText(v: string): string {
  return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export function filterVideos(videos: TrainingVideo[], query: string): TrainingVideo[] {
  const q = normalizeText(query);
  if (!q) return videos;
  return videos.filter((v) =>
    [v.title, v.description, v.topic].some((field) => normalizeText(field ?? '').includes(q)),
  );
}

/** Agrupa em tópicos na ordem de sort_order (para as linhas do carrossel). */
export function groupByTopic(videos: TrainingVideo[]): Array<[string, TrainingVideo[]]> {
  const map = new Map<string, TrainingVideo[]>();
  for (const v of videos) {
    const topic = v.topic || 'Geral';
    if (!map.has(topic)) map.set(topic, []);
    map.get(topic)!.push(v);
  }
  return Array.from(map.entries());
}

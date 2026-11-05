import type { TrainingVideo } from '@/types';

/**
 * Move o item arrastado (`fromId`) para a posição do item solto (`toId`).
 * A lista original não é mutada — devolve uma nova lista.
 */
export function reorderById<T extends { id: string }>(items: T[], fromId: string, toId: string): T[] {
  const fromIndex = items.findIndex((i) => i.id === fromId);
  if (fromIndex < 0 || fromId === toId) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  const targetIndex = next.findIndex((i) => i.id === toId);
  if (targetIndex < 0) return items;
  next.splice(targetIndex, 0, moved);
  return next;
}

/** Sort_order sequencial (1..n) para a ordem exibida. */
export function sortOrdersFor<T extends { id: string }>(items: T[]): Array<{ id: string; sort_order: number }> {
  return items.map((item, index) => ({ id: item.id, sort_order: index + 1 }));
}

/** Lista de vídeos já na ordem de exibição (ordem persistida + criação). */
export function sortVideos(videos: TrainingVideo[]): TrainingVideo[] {
  return [...videos].sort((a, b) => a.sort_order - b.sort_order);
}

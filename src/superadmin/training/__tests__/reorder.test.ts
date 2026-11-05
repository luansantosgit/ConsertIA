import { describe, it, expect } from 'vitest';
import { reorderById, sortOrdersFor, sortVideos } from '../reorder';
import type { TrainingVideo } from '@/types';

const video = (id: string, sort_order: number): TrainingVideo => ({
  id, title: id, description: '', topic: 'Geral', source: 'youtube',
  url: 'https://youtu.be/dQw4w9WgXcQ', thumbnail_url: null,
  sort_order, active: true, created_at: '', updated_at: '',
});

const list = [video('a', 1), video('b', 2), video('c', 3)];

describe('reorderById', () => {
  it('move o item arrastado para a posição do alvo', () => {
    expect(reorderById(list, 'a', 'c').map((v) => v.id)).toEqual(['b', 'a', 'c']);
  });

  it('move para cima', () => {
    expect(reorderById(list, 'c', 'a').map((v) => v.id)).toEqual(['c', 'a', 'b']);
  });

  it('não altera a lista original', () => {
    reorderById(list, 'a', 'c');
    expect(list.map((v) => v.id)).toEqual(['a', 'b', 'c']);
  });

  it('ignora ids inexistentes ou iguais', () => {
    expect(reorderById(list, 'a', 'a')).toBe(list);
    expect(reorderById(list, 'zzz', 'c')).toBe(list);
  });
});

describe('sortOrdersFor', () => {
  it('gera sort_order sequencial', () => {
    expect(sortOrdersFor(list)).toEqual([
      { id: 'a', sort_order: 1 },
      { id: 'b', sort_order: 2 },
      { id: 'c', sort_order: 3 },
    ]);
  });
});

describe('sortVideos', () => {
  it('ordena por sort_order sem mutar a entrada', () => {
    const shuffled = [video('c', 3), video('a', 1), video('b', 2)];
    expect(sortVideos(shuffled).map((v) => v.id)).toEqual(['a', 'b', 'c']);
    expect(shuffled.map((v) => v.id)).toEqual(['c', 'a', 'b']);
  });
});

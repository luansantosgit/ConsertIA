import { describe, it, expect } from 'vitest';
import { filterVideos, groupByTopic, normalizeText } from '../filter';
import type { TrainingVideo } from '@/types';

const video = (id: string, title: string, topic: string, description = ''): TrainingVideo => ({
  id, title, description, topic, source: 'youtube',
  url: `https://youtu.be/${id}aaaaaa`, thumbnail_url: null,
  sort_order: 0, active: true, created_at: '', updated_at: '',
});

const list = [
  video('v1', 'Como criar uma OS', 'Ordens de Serviço', 'Passo a passo das ordens'),
  video('v2', 'Configurando o agente de IA', 'Configurações'),
];

describe('normalizeText', () => {
  it('remove acentos e case', () => {
    expect(normalizeText('Ordens de Serviço')).toBe('ordens de servico');
  });
});

describe('filterVideos', () => {
  it('sem query retorna tudo', () => {
    expect(filterVideos(list, '')).toHaveLength(2);
  });

  it('busca por título, descrição e tópico sem acento', () => {
    expect(filterVideos(list, 'ordens de servico').map((v) => v.id)).toEqual(['v1']);
    expect(filterVideos(list, 'PASSO A PASSO').map((v) => v.id)).toEqual(['v1']);
    expect(filterVideos(list, 'configuracoes').map((v) => v.id)).toEqual(['v2']);
  });

  it('não casa termo inexistente', () => {
    expect(filterVideos(list, 'faturamento')).toHaveLength(0);
  });
});

describe('groupByTopic', () => {
  it('agrupa preservando a ordem do sort_order', () => {
    const groups = groupByTopic(list);
    expect(groups.map(([topic]) => topic)).toEqual(['Ordens de Serviço', 'Configurações']);
    expect(groups[0][1]).toHaveLength(1);
  });

  it('usa tópico Geral quando vazio', () => {
    const groups = groupByTopic([video('v3', 'Sem tópico', '')]);
    expect(groups[0][0]).toBe('Geral');
  });
});

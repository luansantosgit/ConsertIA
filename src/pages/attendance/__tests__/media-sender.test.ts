import { describe, it, expect } from 'vitest';
import {
  baseMediaType,
  formatFileSize,
  resolveMediaType,
  WHATSAPP_LIMITS,
} from '../media-sender';

const MB = 1024 * 1024;

describe('media-sender', () => {
  it('classifica o tipo base pelo MIME', () => {
    expect(baseMediaType('image/jpeg')).toBe('image');
    expect(baseMediaType('video/mp4')).toBe('video');
    expect(baseMediaType('audio/ogg')).toBe('ptt');
    expect(baseMediaType('application/pdf')).toBe('document');
  });

  it('mantém vídeo dentro do limite de 16 MB', () => {
    expect(resolveMediaType('video/mp4', 10 * MB)).toEqual({
      type: 'video',
      converted: false,
    });
  });

  it('converte vídeo acima de 16 MB para documento', () => {
    expect(resolveMediaType('video/mp4', 20 * MB)).toEqual({
      type: 'document',
      converted: true,
    });
  });

  it('mantém vídeo MP4 com codecs como vídeo dentro do limite', () => {
    expect(resolveMediaType('video/mp4;codecs=avc1,mp4a.40.2', 10 * MB)).toEqual({
      type: 'video',
      converted: false,
    });
  });

  it('envia vídeo não-MP4 como documento (ex.: .mov do iPhone)', () => {
    expect(resolveMediaType('video/quicktime', 5 * MB)).toEqual({
      type: 'document',
      converted: true,
    });
  });

  it('converte imagem e áudio acima de 16 MB para documento', () => {
    expect(resolveMediaType('image/png', WHATSAPP_LIMITS.image + 1).type).toBe('document');
    expect(resolveMediaType('audio/ogg', WHATSAPP_LIMITS.audio + 1).type).toBe('document');
  });

  it('não converte documento (limite de 100 MB)', () => {
    expect(resolveMediaType('application/pdf', 90 * MB)).toEqual({
      type: 'document',
      converted: false,
    });
  });

  it('formata o tamanho para mensagens de erro', () => {
    expect(formatFileSize(1536)).toBe('2 KB');
    expect(formatFileSize(20 * MB)).toBe('20,0 MB');
  });
});

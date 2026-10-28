import { describe, expect, it } from 'vitest';
import {
  cameraFileName,
  extensionForMime,
  fitWithin,
  formatDuration,
  mapCameraError,
  pickRecorderMimeType,
} from '../camera-utils';

describe('camera-utils', () => {
  it('prefere MP4 quando o navegador suporta', () => {
    expect(pickRecorderMimeType(() => true)).toBe('video/mp4;codecs=avc1,mp4a.40.2');
  });

  it('cai para WebM quando MP4 não é suportado', () => {
    expect(pickRecorderMimeType(type => type.startsWith('video/webm'))).toBe(
      'video/webm;codecs=vp9,opus',
    );
  });

  it('retorna vazio quando nenhum container é suportado', () => {
    expect(pickRecorderMimeType(() => false)).toBe('');
  });

  it('deriva a extensão do MIME', () => {
    expect(extensionForMime('video/mp4;codecs=avc1')).toBe('mp4');
    expect(extensionForMime('video/webm;codecs=vp9')).toBe('webm');
    expect(extensionForMime('image/jpeg')).toBe('jpg');
    expect(extensionForMime('image/png')).toBe('png');
  });

  it('formata a duração da gravação', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65_000)).toBe('1:05');
  });

  it('reduz a foto mantendo a proporção', () => {
    expect(fitWithin(4000, 3000, 1920)).toEqual({ width: 1920, height: 1440 });
    expect(fitWithin(1280, 720, 1920)).toEqual({ width: 1280, height: 720 });
  });

  it('mapeia erros de câmera para mensagens amigáveis', () => {
    expect(mapCameraError({ name: 'NotAllowedError' })).toContain('negada');
    expect(mapCameraError({ name: 'NotFoundError' })).toContain('Nenhuma câmera');
    expect(mapCameraError({ name: 'NotReadableError' })).toContain('outro aplicativo');
  });

  it('nomeia os arquivos com data e extensão', () => {
    const date = new Date(2026, 9, 28, 13, 45, 9);
    expect(cameraFileName('photo', 'image/jpeg', date)).toBe('foto-20261028-134509.jpg');
    expect(cameraFileName('video', 'video/mp4', date)).toBe('video-20261028-134509.mp4');
  });
});

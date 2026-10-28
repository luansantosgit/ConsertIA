import { describe, expect, it } from 'vitest';
import { isMp4Recording, remuxToProgressiveMp4 } from '../remux-mp4';

describe('remux-mp4', () => {
  it('reconhece MP4 mesmo com codecs no MIME', () => {
    expect(isMp4Recording(new File([], 'a.mp4', { type: 'video/mp4;codecs=avc1' }))).toBe(true);
    expect(isMp4Recording(new File([], 'a.mp4', { type: 'video/mp4' }))).toBe(true);
  });

  it('não trata WebM como MP4', () => {
    expect(isMp4Recording(new File([], 'a.webm', { type: 'video/webm' }))).toBe(false);
  });

  it('devolve o próprio arquivo quando não é MP4', async () => {
    const file = new File(['x'], 'a.webm', { type: 'video/webm' });
    await expect(remuxToProgressiveMp4(file)).resolves.toBe(file);
  });
});

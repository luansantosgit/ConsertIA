import { describe, it, expect } from 'vitest';
import { detectVideoSource, parseYouTubeId, youtubeEmbedUrl, youtubeThumbUrl } from '../training-video';

describe('parseYouTubeId', () => {
  it('extrai ID de URL watch', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&rel=0')).toBe('dQw4w9WgXcQ');
  });

  it('extrai ID de youtu.be', () => {
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extrai ID de shorts, embed e live', () => {
    for (const url of [
      'https://youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/live/dQw4w9WgXcQ',
    ]) {
      expect(parseYouTubeId(url)).toBe('dQw4w9WgXcQ');
    }
  });

  it('retorna null para URL inválida', () => {
    expect(parseYouTubeId('https://youtube.com/sem-id')).toBeNull();
    expect(parseYouTubeId('https://sknimzjwpdbcuutxbycq.supabase.co/a.mp4')).toBeNull();
  });
});

describe('detectVideoSource', () => {
  it('detecta youtube', () => {
    expect(detectVideoSource('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
  });

  it('detecta storage por padrão', () => {
    expect(detectVideoSource('https://sknimzjwpdbcuutxbycq.supabase.co/storage/v1/object/public/training-videos/videos/a.mp4')).toBe('storage');
  });
});

describe('youtubeEmbedUrl / youtubeThumbUrl', () => {
  it('monta embed nocookie com autoplay', () => {
    expect(youtubeEmbedUrl('dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&modestbranding=1');
  });

  it('monta thumbnail hqdefault', () => {
    expect(youtubeThumbUrl('dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
});

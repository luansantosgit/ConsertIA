import type { TrainingVideoSource } from '@/types';

/**
 * Helpers de vídeo do portal de treinamento:
 * distinguir YouTube de arquivo no Storage e montar player/thumb.
 */

/** Extrai o ID de um vídeo do YouTube (watch, youtu.be, shorts, embed, live). */
export function parseYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*v=)([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const m = url.match(pattern);
    if (m) return m[1];
  }
  return null;
}

/** YouTube se o URL contém um ID válido; senão é arquivo do Storage. */
export function detectVideoSource(url: string): TrainingVideoSource {
  return parseYouTubeId(url) ? 'youtube' : 'storage';
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
}

export function youtubeThumbUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

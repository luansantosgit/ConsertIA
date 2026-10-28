/**
 * Utilitários da câmera do chat.
 *
 * O vídeo é gravado em 720p com bitrate controlado (~1,5 Mbps),
 * muito menor que a câmera nativa (que costuma gravar em 4K a ~17 Mbps).
 * O MediaRecorder usa MP4 quando o navegador suporta (Chrome/Safari atuais);
 * WebM fica apenas como fallback.
 *
 * Não há corte por peso: se o arquivo passar de 16 MB (limite de vídeo do
 * WhatsApp), o media-sender o envia automaticamente como documento (até 100 MB).
 */

export type CameraFacing = 'environment' | 'user';
export type CameraMode = 'photo' | 'video';

/** Limite de duração da gravação: 60 s. */
export const RECORDING_MAX_MS = 60_000;
export const VIDEO_BITS_PER_SECOND = 1_500_000;
export const AUDIO_BITS_PER_SECOND = 64_000;
export const PHOTO_MAX_DIMENSION = 1920;
export const PHOTO_QUALITY = 0.86;

const MP4_MIME_TYPES = [
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4;codecs=avc1',
  'video/mp4',
];

const WEBM_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

/** Escolhe o melhor container suportado, priorizando MP4 (exigido pela Uazapi). */
export function pickRecorderMimeType(isSupported: (type: string) => boolean): string {
  for (const type of [...MP4_MIME_TYPES, ...WEBM_MIME_TYPES]) {
    if (isSupported(type)) return type;
  }
  return '';
}

export function extensionForMime(mime: string): string {
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  return 'bin';
}

export function timestampForFile(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function cameraFileName(kind: CameraMode, mime: string, date = new Date()): string {
  const prefix = kind === 'photo' ? 'foto' : 'video';
  return `${prefix}-${timestampForFile(date)}.${extensionForMime(mime)}`;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Redimensiona mantendo proporção para a foto não sair gigante. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 1, height: 1 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function mapCameraError(err: unknown): string {
  const name = (err as { name?: string } | null)?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Permissão de câmera negada. Libere o acesso nas configurações do navegador.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Nenhuma câmera encontrada neste dispositivo.';
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return 'A câmera está em uso por outro aplicativo.';
  }
  return 'Não foi possível abrir a câmera. Tente novamente.';
}

/** Captura o frame atual do vídeo como JPEG (sem espelhar, como a câmera nativa). */
export async function capturePhoto(video: HTMLVideoElement): Promise<File> {
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error('A câmera ainda está carregando. Tente novamente.');
  }
  const { width, height } = fitWithin(video.videoWidth, video.videoHeight, PHOTO_MAX_DIMENSION);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível capturar a foto.');
  ctx.drawImage(video, 0, 0, width, height);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY));
  if (!blob) throw new Error('Não foi possível capturar a foto.');
  return new File([blob], cameraFileName('photo', 'image/jpeg'), { type: 'image/jpeg' });
}

/**
 * Fallback quando o remux do vídeo falha: envia como arquivo, já que o
 * MP4 fragmentado do MediaRecorder é recusado pelo WhatsApp.
 */
export function asDocumentFile(file: File): File {
  return new File([file], file.name, { type: 'application/mp4', lastModified: file.lastModified });
}

export function fileFromRecording(blob: Blob, mime: string): File {
  // Remove os codecs do MIME: o media-sender compara com video/mp4 exato
  // para decidir entre vídeo e documento.
  const raw = mime || blob.type || 'video/mp4';
  const type = raw.split(';')[0].trim() || 'video/mp4';
  return new File([blob], cameraFileName('video', type), { type });
}

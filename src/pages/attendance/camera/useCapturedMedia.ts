import { useCallback, useEffect, useRef, useState } from 'react';
import {
  asDocumentFile,
  capturePhoto,
  fileFromRecording,
  type CameraMode,
} from './camera-utils';
import { remuxToProgressiveMp4 } from './remux-mp4';

interface CapturedMedia {
  file: File;
  url: string;
  kind: CameraMode;
}

/**
 * Guarda a mídia capturada (foto/vídeo) e prepara o vídeo para envio.
 * O MP4 do MediaRecorder é fragmentado; antes de sair, vira progressivo
 * (o WhatsApp recusa o formato fragmentado). Se o remux falhar, o vídeo
 * segue como arquivo, que o WhatsApp aceita.
 */
export function useCapturedMedia() {
  const urlRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const [captured, setCaptured] = useState<CapturedMedia | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const show = useCallback((file: File, kind: CameraMode) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setCaptured({ file, url, kind });
  }, []);

  const clear = useCallback(() => {
    generationRef.current += 1;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setCaptured(null);
    setProcessing(false);
    setError(null);
  }, []);

  const takePhoto = useCallback(async (video: HTMLVideoElement): Promise<boolean> => {
    try {
      show(await capturePhoto(video), 'photo');
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível capturar a foto.');
      return false;
    }
  }, [show]);

  const takeVideo = useCallback(async (blob: Blob, mime: string) => {
    const generation = generationRef.current;
    const file = fileFromRecording(blob, mime);
    setProcessing(true);
    try {
      const ready = await remuxToProgressiveMp4(file);
      if (generation !== generationRef.current) return;
      show(ready, 'video');
    } catch (err) {
      console.error('Falha ao converter o vídeo para MP4 progressivo:', err);
      if (generation !== generationRef.current) return;
      show(asDocumentFile(file), 'video');
    } finally {
      setProcessing(false);
    }
  }, [show]);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  return { captured, processing, error, setError, clear, takePhoto, takeVideo };
}

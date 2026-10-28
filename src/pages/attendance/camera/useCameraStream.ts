import { useCallback, useEffect, useRef, useState } from 'react';
import { mapCameraError, type CameraFacing } from './camera-utils';

interface UseCameraStreamOptions {
  active: boolean;
  initialFacing?: CameraFacing;
}

export interface CameraStreamState {
  stream: MediaStream | null;
  loading: boolean;
  error: string | null;
  facing: CameraFacing;
  hasMultipleCameras: boolean;
  hasAudio: boolean;
  switchCamera: () => void;
  retry: () => void;
  stop: () => void;
}

// 720p (1280x720 ou 720x1280 no retrato): metade dos pixels de 1080p,
// mantendo nitidez suficiente para vídeos de assistência técnica.
const VIDEO_CONSTRAINTS = {
  width: { ideal: 1280, max: 1280 },
  height: { ideal: 720, max: 1280 },
  frameRate: { ideal: 30, max: 30 },
};

/**
 * Abre a câmera via getUserMedia e mantém o stream vivo enquanto o modal
 * estiver aberto. Se o microfone for negado/indisponível, tenta de novo
 * apenas com vídeo (gravação silenciosa) em vez de falhar tudo.
 */
export function useCameraStream({
  active,
  initialFacing = 'environment',
}: UseCameraStreamOptions): CameraStreamState {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraFacing>(initialFacing);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  /** Invalida requisições em andamento (usado no cleanup e ao fechar). */
  const invalidate = useCallback(() => {
    requestIdRef.current += 1;
  }, []);

  const request = useCallback(async (mode: CameraFacing) => {
    const requestId = ++requestIdRef.current;
    setError(null);
    setLoading(true);
    stopTracks();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Câmera não disponível neste navegador. Use HTTPS e um navegador atualizado.');
      setLoading(false);
      return;
    }

    const video = { ...VIDEO_CONSTRAINTS, facingMode: { ideal: mode } };
    try {
      let media: MediaStream;
      let audio = true;
      try {
        media = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      } catch {
        audio = false;
        media = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      }

      if (requestIdRef.current !== requestId) {
        media.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = media;
      setStream(media);
      setHasAudio(audio && media.getAudioTracks().length > 0);

      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      if (requestIdRef.current === requestId) {
        setHasMultipleCameras(devices.filter(device => device.kind === 'videoinput').length > 1);
      }
    } catch (err) {
      if (requestIdRef.current === requestId) setError(mapCameraError(err));
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [stopTracks]);

  useEffect(() => {
    if (!active) {
      invalidate();
      stopTracks();
      setLoading(false);
      setError(null);
      return;
    }
    void request(facing);
    return () => {
      invalidate();
      stopTracks();
    };
    // `facing` só define a câmera inicial; a troca chama request() diretamente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const switchCamera = useCallback(() => {
    const next: CameraFacing = facing === 'environment' ? 'user' : 'environment';
    setFacing(next);
    void request(next);
  }, [facing, request]);

  const retry = useCallback(() => {
    void request(facing);
  }, [facing, request]);

  const stop = useCallback(() => {
    invalidate();
    stopTracks();
    setLoading(false);
  }, [invalidate, stopTracks]);

  return {
    stream,
    loading,
    error,
    facing,
    hasMultipleCameras,
    hasAudio,
    switchCamera,
    retry,
    stop,
  };
}

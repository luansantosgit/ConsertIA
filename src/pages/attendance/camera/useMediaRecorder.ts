import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AUDIO_BITS_PER_SECOND,
  RECORDING_MAX_BYTES,
  RECORDING_MAX_MS,
  VIDEO_BITS_PER_SECOND,
  pickRecorderMimeType,
} from './camera-utils';

interface UseMediaRecorderOptions {
  onFinish: (blob: Blob, mime: string) => void;
}

export interface MediaRecorderState {
  recording: boolean;
  elapsedMs: number;
  bytes: number;
  error: string | null;
  start: (stream: MediaStream) => boolean;
  stop: () => void;
  cancel: () => void;
}

/**
 * Grava o stream da câmera com bitrate controlado. Para sozinho ao atingir
 * 60 s ou 15 MB — assim o arquivo sempre cabe no limite de vídeo do WhatsApp
 * (16 MB) e não vira documento sem o usuário perceber.
 */
export function useMediaRecorder({ onFinish }: UseMediaRecorderOptions): MediaRecorderState {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [bytes, setBytes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bytesRef = useRef(0);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const finishRef = useRef(onFinish);
  const finishEnabledRef = useRef(false);

  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }, []);

  const cancel = useCallback(() => {
    finishEnabledRef.current = false;
    stop();
  }, [stop]);

  const start = useCallback((stream: MediaStream) => {
    if (typeof MediaRecorder === 'undefined') {
      setError('Gravação de vídeo não é suportada neste navegador.');
      return false;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') return false;

    const mime = pickRecorderMimeType(type => MediaRecorder.isTypeSupported(type));
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        ...(mime ? { mimeType: mime } : {}),
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
      });
    } catch {
      setError('Não foi possível iniciar a gravação neste dispositivo.');
      return false;
    }

    chunksRef.current = [];
    bytesRef.current = 0;
    setBytes(0);
    setElapsedMs(0);
    setError(null);
    startedAtRef.current = performance.now();
    finishEnabledRef.current = true;
    recorderRef.current = recorder;

    recorder.ondataavailable = event => {
      if (event.data.size === 0) return;
      chunksRef.current.push(event.data);
      bytesRef.current += event.data.size;
      setBytes(bytesRef.current);
      if (bytesRef.current >= RECORDING_MAX_BYTES && recorder.state === 'recording') {
        recorder.stop();
      }
    };

    recorder.onstop = () => {
      clearTimer();
      setRecording(false);
      const finalMime = recorder.mimeType || mime || 'video/mp4';
      const blob = new Blob(chunksRef.current, { type: finalMime });
      const wasEnabled = finishEnabledRef.current;
      const shouldFinish = wasEnabled && blob.size > 0;
      finishEnabledRef.current = false;
      recorderRef.current = null;
      chunksRef.current = [];
      if (shouldFinish) finishRef.current(blob, finalMime);
      else if (wasEnabled) setError('Gravação muito curta. Tente novamente.');
    };

    try {
      recorder.start(1000);
    } catch {
      setError('Não foi possível iniciar a gravação neste dispositivo.');
      recorderRef.current = null;
      finishEnabledRef.current = false;
      return false;
    }

    setRecording(true);
    timerRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startedAtRef.current;
      setElapsedMs(elapsed);
      if (elapsed >= RECORDING_MAX_MS && recorder.state === 'recording') {
        recorder.stop();
      }
    }, 250);
    return true;
  }, [clearTimer]);

  useEffect(() => () => {
    finishEnabledRef.current = false;
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }, [clearTimer]);

  return { recording, elapsedMs, bytes, error, start, stop, cancel };
}

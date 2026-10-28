import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCameraStream } from './useCameraStream';
import { useMediaRecorder } from './useMediaRecorder';
import { capturePhoto, fileFromRecording, type CameraMode } from './camera-utils';
import { CameraCapturedPreview } from './CameraCapturedPreview';
import { CameraErrorState } from './CameraErrorState';
import { CameraLiveOverlay } from './CameraLiveOverlay';
import { CameraVideo } from './CameraVideo';

interface CameraCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

interface CapturedMedia {
  file: File;
  url: string;
  kind: CameraMode;
}

/** Câmera em tela cheia com alternância foto/vídeo e prévia antes de enviar. */
export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  open,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const capturedUrlRef = useRef<string | null>(null);
  const capturingRef = useRef(false);
  const closeRef = useRef<() => void>(() => {});
  const [mode, setMode] = useState<CameraMode>('photo');
  const [captured, setCaptured] = useState<CapturedMedia | null>(null);
  const [flash, setFlash] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const camera = useCameraStream({ active: open });
  const { stop: stopCamera, retry: retryCamera } = camera;

  const handleVideoFinish = useCallback((blob: Blob, mime: string) => {
    const file = fileFromRecording(blob, mime);
    if (capturedUrlRef.current) URL.revokeObjectURL(capturedUrlRef.current);
    const url = URL.createObjectURL(file);
    capturedUrlRef.current = url;
    setCaptured({ file, url, kind: 'video' });
  }, []);

  const {
    recording,
    elapsedMs,
    bytes,
    error: recorderError,
    start: startRecording,
    stop: stopRecording,
    cancel: cancelRecording,
  } = useMediaRecorder({ onFinish: handleVideoFinish });

  const clearCaptured = useCallback(() => {
    if (capturedUrlRef.current) {
      URL.revokeObjectURL(capturedUrlRef.current);
      capturedUrlRef.current = null;
    }
    setCaptured(null);
  }, []);

  const handleClose = useCallback(() => {
    cancelRecording();
    stopCamera();
    clearCaptured();
    onClose();
  }, [cancelRecording, stopCamera, clearCaptured, onClose]);

  useEffect(() => {
    closeRef.current = handleClose;
  }, [handleClose]);

  // Mantém o elemento <video> sincronizado com o stream da câmera.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    setVideoReady(false);
    el.srcObject = camera.stream;
    if (camera.stream) void el.play().catch(() => {});
    return () => { el.srcObject = null; };
  }, [camera.stream]);

  // Foco no modal ao abrir (acessibilidade de teclado).
  useEffect(() => {
    if (open) shellRef.current?.focus();
  }, [open]);

  // Reset ao fechar + libera a URL da prévia ao desmontar.
  useEffect(() => {
    if (open) return;
    clearCaptured();
    setMode('photo');
    setPhotoError(null);
    setFlash(false);
  }, [open, clearCaptured]);

  useEffect(() => () => {
    if (capturedUrlRef.current) URL.revokeObjectURL(capturedUrlRef.current);
  }, []);

  // Trava o scroll do fundo e fecha com Esc.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const takePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || capturingRef.current) return;
    capturingRef.current = true;
    try {
      const file = await capturePhoto(video);
      if (capturedUrlRef.current) URL.revokeObjectURL(capturedUrlRef.current);
      const url = URL.createObjectURL(file);
      capturedUrlRef.current = url;
      setCaptured({ file, url, kind: 'photo' });
      setPhotoError(null);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 180);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Não foi possível capturar a foto.');
    } finally {
      capturingRef.current = false;
    }
  }, []);

  const handleShutter = useCallback(() => {
    if (mode === 'photo') {
      void takePhoto();
      return;
    }
    if (recording) {
      stopRecording();
      return;
    }
    if (camera.stream) startRecording(camera.stream);
  }, [mode, recording, stopRecording, camera.stream, startRecording, takePhoto]);

  const handleModeChange = useCallback((next: CameraMode) => {
    if (recording) return;
    setMode(next);
    setPhotoError(null);
  }, [recording]);

  const handleRetake = useCallback(() => {
    clearCaptured();
    setPhotoError(null);
    if (camera.error) retryCamera();
  }, [clearCaptured, camera.error, retryCamera]);

  const handleSend = useCallback(() => {
    if (!captured) return;
    onCapture(captured.file);
    handleClose();
  }, [captured, onCapture, handleClose]);

  if (!open) return null;

  return createPortal(
    <div className="camera-overlay" role="dialog" aria-modal="true" aria-label="Câmera">
      <div className="camera-shell" ref={shellRef} tabIndex={-1}>
        <CameraVideo
          videoRef={videoRef}
          facing={camera.facing}
          onLoadedMetadata={() => setVideoReady(true)}
        />

        {captured ? (
          <CameraCapturedPreview
            url={captured.url}
            kind={captured.kind}
            onRetake={handleRetake}
            onSend={handleSend}
          />
        ) : camera.error ? (
          <CameraErrorState
            message={camera.error}
            onClose={handleClose}
            onRetry={retryCamera}
          />
        ) : (
          <CameraLiveOverlay
            controls={{
              mode,
              recording,
              elapsedMs,
              bytes,
              disabled: camera.loading || !camera.stream || !videoReady,
              hasMultipleCameras: camera.hasMultipleCameras,
              onModeChange: handleModeChange,
              onShutter: handleShutter,
              onSwitch: camera.switchCamera,
              onClose: handleClose,
            }}
            loading={camera.loading}
            photoError={photoError}
            recorderError={recorderError}
          />
        )}

        {flash && <div className="camera-flash" />}
      </div>
    </div>,
    document.body,
  );
};

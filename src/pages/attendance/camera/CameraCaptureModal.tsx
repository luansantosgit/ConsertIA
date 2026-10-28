import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCameraStream } from './useCameraStream';
import { useMediaRecorder } from './useMediaRecorder';
import { useCapturedMedia } from './useCapturedMedia';
import { type CameraMode } from './camera-utils';
import { CameraCapturedPreview } from './CameraCapturedPreview';
import { CameraErrorState } from './CameraErrorState';
import { CameraLiveOverlay } from './CameraLiveOverlay';
import { CameraProcessing } from './CameraProcessing';
import { CameraVideo } from './CameraVideo';

interface CameraCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

/** Câmera em tela cheia com alternância foto/vídeo e prévia antes de enviar. */
export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  open,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const capturingRef = useRef(false);
  const closeRef = useRef<() => void>(() => {});
  const [mode, setMode] = useState<CameraMode>('photo');
  const [flash, setFlash] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const camera = useCameraStream({ active: open });
  const media = useCapturedMedia();
  const { stop: stopCamera, retry: retryCamera } = camera;
  const { clear: clearMedia, takePhoto, takeVideo } = media;

  const {
    recording,
    elapsedMs,
    bytes,
    error: recorderError,
    start: startRecording,
    stop: stopRecording,
    cancel: cancelRecording,
  } = useMediaRecorder({ onFinish: takeVideo });

  const handleClose = useCallback(() => {
    cancelRecording();
    stopCamera();
    clearMedia();
    onClose();
  }, [cancelRecording, stopCamera, clearMedia, onClose]);

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

  // Reset ao fechar.
  useEffect(() => {
    if (open) return;
    clearMedia();
    setMode('photo');
    setFlash(false);
  }, [open, clearMedia]);

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

  const handlePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || capturingRef.current) return;
    capturingRef.current = true;
    try {
      if (await takePhoto(video)) {
        setFlash(true);
        window.setTimeout(() => setFlash(false), 180);
      }
    } finally {
      capturingRef.current = false;
    }
  }, [takePhoto]);

  const handleShutter = useCallback(() => {
    if (mode === 'photo') {
      void handlePhoto();
      return;
    }
    if (recording) {
      stopRecording();
      return;
    }
    if (camera.stream) startRecording(camera.stream);
  }, [mode, recording, stopRecording, camera.stream, startRecording, handlePhoto]);

  const handleModeChange = useCallback((next: CameraMode) => {
    if (recording) return;
    setMode(next);
    media.setError(null);
  }, [recording, media]);

  const handleRetake = useCallback(() => {
    clearMedia();
    if (camera.error) retryCamera();
  }, [clearMedia, camera.error, retryCamera]);

  const handleSend = useCallback(() => {
    if (!media.captured) return;
    onCapture(media.captured.file);
    handleClose();
  }, [media.captured, onCapture, handleClose]);

  if (!open) return null;

  return createPortal(
    <div className="camera-overlay" role="dialog" aria-modal="true" aria-label="Câmera">
      <div className="camera-shell" ref={shellRef} tabIndex={-1}>
        <CameraVideo
          videoRef={videoRef}
          facing={camera.facing}
          onLoadedMetadata={() => setVideoReady(true)}
        />

        {media.processing ? (
          <CameraProcessing message="Processando vídeo..." />
        ) : media.captured ? (
          <CameraCapturedPreview
            url={media.captured.url}
            kind={media.captured.kind}
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
            photoError={media.error}
            recorderError={recorderError}
          />
        )}

        {flash && <div className="camera-flash" />}
      </div>
    </div>,
    document.body,
  );
};

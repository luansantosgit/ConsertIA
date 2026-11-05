import React from 'react';
import { Camera, SwitchCamera, Video, X } from 'lucide-react';
import { formatDuration, type CameraMode } from './camera-utils';
import { formatFileSize } from '../media-sender';

interface CameraControlsProps {
  mode: CameraMode;
  recording: boolean;
  elapsedMs: number;
  bytes: number;
  disabled: boolean;
  hasMultipleCameras: boolean;
  onModeChange: (mode: CameraMode) => void;
  onShutter: () => void;
  onSwitch: () => void;
  onClose: () => void;
}

/** Barras superior/inferior da câmera: fechar, trocar câmera, modo e obturador. */
export const CameraControls: React.FC<CameraControlsProps> = ({
  mode,
  recording,
  elapsedMs,
  bytes,
  disabled,
  hasMultipleCameras,
  onModeChange,
  onShutter,
  onSwitch,
  onClose,
}) => {
  const hint = recording
    ? 'Toque no quadrado para parar'
    : mode === 'video'
      ? 'Toque para gravar · máx. 60s'
      : 'Toque para tirar foto';

  return (
    <>
      <div className="camera-top">
        <button
          type="button"
          className="camera-round-btn"
          onClick={onClose}
          aria-label="Fechar câmera"
        >
          <X size={20} />
        </button>

        {recording ? (
          <span className="camera-timer" role="status">
            <span className="camera-dot" />
            {formatDuration(elapsedMs)} · {bytes > 0 ? formatFileSize(bytes) : '0 KB'}
          </span>
        ) : (
          <span />
        )}

        {hasMultipleCameras ? (
          <button
            type="button"
            className="camera-round-btn"
            onClick={onSwitch}
            disabled={recording}
            aria-label="Trocar câmera"
          >
            <SwitchCamera size={20} />
          </button>
        ) : (
          <span style={{ width: 42 }} />
        )}
      </div>

      <div className="camera-bottom">
        <div className="camera-mode" role="group" aria-label="Modo de captura">
          <button
            type="button"
            className={mode === 'photo' ? 'active' : ''}
            onClick={() => onModeChange('photo')}
            disabled={recording}
            aria-pressed={mode === 'photo'}
          >
            <Camera size={15} /> Foto
          </button>
          <button
            type="button"
            className={mode === 'video' ? 'active' : ''}
            onClick={() => onModeChange('video')}
            disabled={recording}
            aria-pressed={mode === 'video'}
          >
            <Video size={15} /> Vídeo
          </button>
        </div>

        <button
          type="button"
          className={`camera-shutter ${mode === 'video' ? 'is-video' : ''} ${recording ? 'is-recording' : ''}`}
          onClick={onShutter}
          disabled={disabled}
          aria-label={recording ? 'Parar gravação' : mode === 'video' ? 'Gravar vídeo' : 'Tirar foto'}
        />

        <span className="camera-hint">{hint}</span>
      </div>
    </>
  );
};

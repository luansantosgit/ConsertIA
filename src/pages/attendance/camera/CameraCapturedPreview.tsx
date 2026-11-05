import React from 'react';
import { RotateCcw, Send } from 'lucide-react';
import type { CameraMode } from './camera-utils';

interface CameraCapturedPreviewProps {
  url: string;
  kind: CameraMode;
  onRetake: () => void;
  onSend: () => void;
}

/** Prévia da foto/vídeo capturado, antes de enviar ao chat. */
export const CameraCapturedPreview: React.FC<CameraCapturedPreviewProps> = ({
  url,
  kind,
  onRetake,
  onSend,
}) => (
  <div className="camera-preview">
    {kind === 'photo' ? (
      <img src={url} alt="Foto capturada" className="camera-preview-media" />
    ) : (
      <video
        src={url}
        className="camera-preview-media"
        controls
        autoPlay
        playsInline
      />
    )}

    <div className="camera-preview-actions">
      <button type="button" className="btn btn-secondary" onClick={onRetake}>
        <RotateCcw size={15} /> Refazer
      </button>
      <button type="button" className="btn btn-primary" onClick={onSend}>
        <Send size={15} /> Enviar
      </button>
    </div>
  </div>
);

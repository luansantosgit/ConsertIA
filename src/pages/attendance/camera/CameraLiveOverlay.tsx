import React from 'react';
import { Loader2 } from 'lucide-react';
import { CameraControls } from './CameraControls';

interface CameraLiveOverlayProps {
  controls: React.ComponentProps<typeof CameraControls>;
  loading: boolean;
  photoError: string | null;
  recorderError: string | null;
}

/** Controles + estados de carregamento/erro sobre o vídeo ao vivo. */
export const CameraLiveOverlay: React.FC<CameraLiveOverlayProps> = ({
  controls,
  loading,
  photoError,
  recorderError,
}) => (
  <>
    <CameraControls {...controls} />

    {loading && (
      <div className="camera-loading">
        <Loader2 size={22} className="camera-spin" />
        Abrindo câmera...
      </div>
    )}

    {(photoError || recorderError) && (
      <div className="camera-inline-error">{photoError || recorderError}</div>
    )}
  </>
);

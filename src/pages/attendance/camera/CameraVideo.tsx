import React from 'react';
import type { CameraFacing } from './camera-utils';

interface CameraVideoProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  facing: CameraFacing;
  onLoadedMetadata: () => void;
}

/** Elemento de vídeo da câmera (sempre montado para não perder o stream). */
export const CameraVideo: React.FC<CameraVideoProps> = ({
  videoRef,
  facing,
  onLoadedMetadata,
}) => (
  <video
    ref={videoRef}
    className="camera-video"
    autoPlay
    playsInline
    muted
    onLoadedMetadata={onLoadedMetadata}
    style={facing === 'user' ? { transform: 'scaleX(-1)' } : undefined}
  />
);

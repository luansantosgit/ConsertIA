import React from 'react';
import { Loader2 } from 'lucide-react';

interface CameraProcessingProps {
  message: string;
}

/** Espera bloqueante enquanto a mídia é preparada (ex.: remux do vídeo). */
export const CameraProcessing: React.FC<CameraProcessingProps> = ({ message }) => (
  <div className="camera-loading" role="status" aria-live="polite">
    <Loader2 size={22} className="camera-spin" />
    {message}
  </div>
);

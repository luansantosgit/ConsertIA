import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface CameraErrorStateProps {
  message: string;
  onClose: () => void;
  onRetry: () => void;
}

/** Estado de erro/permissão negada da câmera. */
export const CameraErrorState: React.FC<CameraErrorStateProps> = ({
  message,
  onClose,
  onRetry,
}) => (
  <div className="camera-error-card">
    <AlertTriangle size={30} />
    <h3>Câmera indisponível</h3>
    <p>{message}</p>
    <div className="camera-error-actions">
      <button type="button" className="btn btn-secondary" onClick={onClose}>
        Fechar
      </button>
      <button type="button" className="btn btn-primary" onClick={onRetry}>
        Tentar novamente
      </button>
    </div>
  </div>
);

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => (
  <div className="empty-state" style={{ minHeight: 200 }}>
    <div className="empty-state-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
      <AlertCircle size={28} />
    </div>
    <h3 className="empty-state-title">Erro</h3>
    <p className="empty-state-desc">{message}</p>
    {onRetry && (
      <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={onRetry}>
        Tentar novamente
      </button>
    )}
  </div>
);

export default ErrorMessage;

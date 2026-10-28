import React from 'react';
import { isChunkLoadError } from '@/lib/chunk-recovery';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children, fallback }) => {
  return (
    <ErrorBoundaryInner fallback={fallback}>
      {children}
    </ErrorBoundaryInner>
  );
};

class ErrorBoundaryInner extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleUpdate = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      // Chunk stale pós-deploy: o app foi atualizado no servidor e a
      // sessão aberta referencia assets que não existem mais. Recarregar
      // busca o index.html novo com os chunks corretos.
      if (isChunkLoadError(this.state.error)) {
        return (
          <div className="empty-state" style={{ minHeight: 300 }}>
            <div className="empty-state-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </div>
            <h3 className="empty-state-title">Nova versão disponível</h3>
            <p className="empty-state-desc">
              O app foi atualizado. Toque em atualizar para carregar a nova versão.
            </p>
            <div className="flex gap-2" style={{ marginTop: 8 }}>
              <button className="btn btn-primary" onClick={this.handleUpdate}>Atualizar agora</button>
            </div>
          </div>
        );
      }

      return (
        <div className="empty-state" style={{ minHeight: 300 }}>
          <div className="empty-state-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="empty-state-title">Algo deu errado</h3>
          <p className="empty-state-desc">{this.state.error?.message || 'Ocorreu um erro inesperado.'}</p>
          <div className="flex gap-2" style={{ marginTop: 8 }}>
            <button className="btn btn-primary" onClick={this.handleRetry}>Tentar novamente</button>
            <button className="btn btn-secondary" onClick={this.handleUpdate}>Recarregar pagina</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

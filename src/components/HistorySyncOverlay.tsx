import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import type { SyncState } from '@/hooks/useHistorySync';

interface HistorySyncOverlayProps {
  state: SyncState;
  progress: number;
  message: string;
}

/**
 * Indicador flutuante de sincronização de histórico.
 * Renderiza no canto inferior direito enquanto syncing/done/error.
 */
export const HistorySyncOverlay: React.FC<HistorySyncOverlayProps> = ({ state, progress, message }) => {
  if (state === 'idle') return null;

  const icon =
    state === 'syncing' ? <RefreshCw size={18} className="spin" />
    : state === 'done' ? <CheckCircle2 size={18} style={{ color: 'var(--success, #22c55e)' }} />
    : <AlertCircle size={18} style={{ color: 'var(--danger, #ef4444)' }} />;

  return (
    <div
      className="card"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 18px',
        borderRadius: 14,
        background: 'var(--bg-primary, #fff)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        maxWidth: 380,
        animation: 'slideInRight 0.25s ease',
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke={state === 'error' ? 'var(--danger, #ef4444)' : 'var(--primary)'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(progress / 100) * 94.2} 94.2`}
            style={{ transition: 'stroke-dasharray 0.4s ease' }}
          />
        </svg>
        {state === 'syncing' ? (
          <span style={{ position: 'absolute', fontSize: '0.5625rem', fontWeight: 700, color: 'var(--primary)' }}>
            {progress}%
          </span>
        ) : (
          <span style={{ position: 'absolute' }}>{icon}</span>
        )}
      </div>
      <div>
        <p style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: 2 }}>
          {state === 'syncing' ? 'Sincronizando histórico' : state === 'done' ? 'Sincronização' : 'Erro na sincronização'}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>{message}</p>
      </div>
    </div>
  );
};

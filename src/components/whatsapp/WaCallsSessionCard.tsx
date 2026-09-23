import { Phone, Settings, Loader2 } from 'lucide-react';
import type { WaCallsSession } from '@/types';

interface WaCallsSessionCardProps {
  session: WaCallsSession;
  callsToday: number;
  maxPerDay: number;
  onStartCall: (sessionId: string) => void;
  onSettings?: (sessionId: string) => void;
}

export function WaCallsSessionCard({
  session,
  callsToday,
  maxPerDay,
  onStartCall,
  onSettings,
}: WaCallsSessionCardProps) {
  const isConnected = session.status === 'connected';
  const isConnecting = session.status === 'connecting';
  const dailyUsage = maxPerDay > 0 ? Math.min(100, (callsToday / maxPerDay) * 100) : 0;

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <Phone size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              {session.name || 'Ligacao'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {session.phone_number || 'Sem numero'}
            </div>
          </div>
        </div>

        <span
          className={`badge ${isConnected ? 'badge-success' : isConnecting ? 'badge-warning' : 'badge-danger'}`}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: 'currentColor',
              display: 'inline-block',
              marginRight: 4,
            }}
          />
          {isConnected ? 'Ativa' : isConnecting ? 'Conectando' : 'Inativa'}
        </span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Chamadas hoje
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {callsToday}/{maxPerDay}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${dailyUsage}%` }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className={`btn ${isConnected ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => onStartCall(session.id)}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Phone size={14} />
          )}
          {isConnected ? 'Iniciar Chamada' : 'Conectar'}
        </button>

        {onSettings && (
          <button
            className="btn btn-ghost"
            onClick={() => onSettings(session.id)}
          >
            <Settings size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

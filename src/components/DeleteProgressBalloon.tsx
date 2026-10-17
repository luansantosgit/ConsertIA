import React from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, RefreshCw, Trash2 } from 'lucide-react';
import { useBulkDeleteStore } from '@/stores/bulk-delete.store';

/**
 * Balão global da exclusão em massa: o modal fecha na hora e este balão
 * acompanha o progresso em TODAS as páginas. No chat (/atendimento) só
 * aparece quando termina — para não atrapalhar o atendente — com um OK
 * para dispensar.
 */
export const DeleteProgressBalloon: React.FC = () => {
  const { status, done, total, dismiss } = useBulkDeleteStore();
  const location = useLocation();
  const isChat = location.pathname.startsWith('/atendimento');

  if (status === 'idle') return null;
  // No chat: só mostra quando concluir (o atendente dá o OK)
  if (isChat && status === 'running') return null;

  const running = status === 'running';
  const progress = running ? Math.round((done / Math.max(total, 1)) * 100) : 100;

  return (
    <button
      onClick={() => { if (!running) dismiss(); }}
      aria-label={running ? 'Exclusão em andamento' : 'Concluir exclusão'}
      style={{
        position: 'fixed', bottom: 24, right: 24,
        // Não sobrepõe o balão de importação quando ambos existem
        ...(running && { marginBottom: 0 }),
        zIndex: 300,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 14,
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
        cursor: running ? 'default' : 'pointer', maxWidth: 320,
        animation: running ? 'slideInRight 0.25s ease' : 'slideInRight 0.25s ease, balloonPulse 1.6s ease-in-out infinite',
      }}
    >
      <span style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: running ? 'var(--danger-bg)' : 'var(--success-bg)',
        color: running ? 'var(--danger)' : 'var(--success)',
      }}>
        {running
          ? <Trash2 size={16} />
          : <CheckCircle2 size={18} />}
      </span>
      <span style={{ textAlign: 'left', minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {running ? 'Excluindo produtos…' : 'Exclusão concluída!'}
        </span>
        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
          {running
            ? `${done} de ${total} removido(s)`
            : `${total} produto(s) removido(s) — clique para fechar`}
        </span>
        {running && (
          <span style={{ display: 'block', height: 4, marginTop: 6, background: 'var(--progress-track)', borderRadius: 99, overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', background: 'var(--danger)', borderRadius: 99, width: `${progress}%`, transition: 'width 0.15s' }} />
          </span>
        )}
      </span>
      {running && <RefreshCw size={13} className="spin" style={{ color: 'var(--danger)', flexShrink: 0 }} />}
    </button>
  );
};

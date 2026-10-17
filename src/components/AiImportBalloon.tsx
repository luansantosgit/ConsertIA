import React from 'react';
import { Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAiImportStore } from '@/stores/ai-import.store';

/**
 * Balão flutuante da importação com IA: aparece quando o modal foi
 * minimizado (ou fechado com processo ativo), mostra o andamento e
 * PULSA quando há algo para o usuário conferir.
 */
export const AiImportBalloon: React.FC = () => {
  const { stage, minimized, modalOpen, analyzeStep, importProgress, result, restore } = useAiImportStore();

  const running = stage === 'analyzing' || stage === 'importing';
  const finished = stage === 'report' || stage === 'done';

  // Sem sessão ativa ou com modal aberto → não mostra o balão
  const visible = minimized && !modalOpen && (running || finished);
  if (!visible) return null;

  const label = stage === 'analyzing'
    ? analyzeStep.label
    : stage === 'importing'
      ? `Enviando ${importProgress.done} de ${importProgress.total} produto(s)...`
      : stage === 'report'
        ? 'Análise concluída! Toque para revisar e enviar'
        : result ?? 'Importação concluída!';

  const progress = stage === 'analyzing'
    ? analyzeStep.progress
    : stage === 'importing'
      ? Math.round((importProgress.done / Math.max(importProgress.total, 1)) * 100)
      : 100;

  return (
    <button
      onClick={restore}
      aria-label="Abrir importação"
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 300,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 14,
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
        cursor: 'pointer', maxWidth: 320,
        animation: running ? 'slideInRight 0.25s ease' : 'slideInRight 0.25s ease, balloonPulse 1.6s ease-in-out infinite',
      }}
    >
      <span style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: finished ? 'var(--success-bg)' : 'var(--primary-light)',
        color: finished ? 'var(--success)' : 'var(--primary-text)',
      }}>
        {running
          ? <RefreshCw size={17} className="spin" />
          : <CheckCircle2 size={18} />}
      </span>
      <span style={{ textAlign: 'left', minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          <Sparkles size={11} color="var(--primary-text)" />
          Importação com IA
        </span>
        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        {running && (
          <span style={{ display: 'block', height: 4, marginTop: 6, background: 'var(--progress-track)', borderRadius: 99, overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', background: 'var(--primary)', borderRadius: 99, width: `${progress}%`, transition: 'width 0.3s' }} />
          </span>
        )}
      </span>
    </button>
  );
};

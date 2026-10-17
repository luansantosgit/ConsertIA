import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAiImportStore } from '@/stores/ai-import.store';

/**
 * Balão flutuante da importação com IA: aparece quando o modal foi
 * minimizado (ou fechado com processo ativo), mostra o andamento e
 * PULSA quando há algo para o usuário conferir. Também avisa quando
 * a análise foi interrompida (reload da página) em vez de sumir.
 *
 * No chat (/atendimento) não aparece durante o processamento para não
 * atrapalhar o atendente — só quando conclui, para ele abrir o modal
 * e ver o que deve ser feito (responder dúvidas ou dar OK para subir).
 */
export const AiImportBalloon: React.FC = () => {
  const { stage, minimized, modalOpen, analyzeStep, importProgress, result, error, restore } = useAiImportStore();
  const location = useLocation();
  const isChat = location.pathname.startsWith('/atendimento');

  const running = stage === 'analyzing' || stage === 'importing';
  const finished = stage === 'report' || stage === 'done';
  const interrupted = stage === 'idle' && Boolean(error);

  // Sem sessão ativa ou com modal aberto → não mostra o balão
  if (!minimized || modalOpen) return null;
  if (!running && !finished && !interrupted) return null;
  // No chat: só mostra quando termina (ou foi interrompida) — nunca durante o processo
  if (isChat && (stage === 'analyzing' || stage === 'importing')) return null;

  const label = stage === 'analyzing'
    ? analyzeStep.label
    : stage === 'importing'
      ? `Enviando ${importProgress.done} de ${importProgress.total} produto(s)...`
      : stage === 'report'
        ? 'Análise concluída! Toque para revisar e enviar'
        : stage === 'done'
          ? result ?? 'Importação concluída!'
          : 'Importação interrompida — toque para ver';

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
        background: interrupted ? 'var(--danger-bg)' : finished ? 'var(--success-bg)' : 'var(--primary-light)',
        color: interrupted ? 'var(--danger)' : finished ? 'var(--success)' : 'var(--primary-text)',
      }}>
        {running
          ? <RefreshCw size={17} className="spin" />
          : interrupted
            ? <AlertTriangle size={18} />
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

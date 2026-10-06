import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, Coins } from 'lucide-react';
import { useAiQuotaAlert } from '@/stores/ai-quota.store';

// Balão flutuante de tokens de IA esgotados (cota >= 110%) —
// aparece em todas as páginas do tenant.
// No chat (/atendimento) o balão flutuante sobe para o header
// (mesma posição do alerta de fatura vencida) para não cobrir o input.
export const AiQuotaAlert: React.FC = () => {
  const { tokensPaused, checked, check } = useAiQuotaAlert();
  const location = useLocation();
  const isChat = location.pathname.startsWith('/atendimento');
  const isAiPage = location.pathname.startsWith('/agente-ia');

  useEffect(() => {
    check();
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [check]);

  if (!checked || !tokensPaused || isAiPage) return null;

  // No chat: chip no header (o Header global le o mesmo store)
  if (isChat) return null;

  return (
    <Link
      to="/agente-ia?comprar=tokens"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 250,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 18px',
        borderRadius: 999,
        background: '#7c3aed',
        color: '#fff',
        fontSize: '0.8125rem',
        fontWeight: 600,
        textDecoration: 'none',
        boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)',
        animation: 'slideUp 0.25s ease',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <Bot size={16} />
      Tokens de IA esgotados — IA pausada
      <span style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 99,
        background: 'rgba(255,255,255,0.25)', fontSize: '0.75rem',
      }}>
        <Coins size={12} /> Comprar mais
      </span>
    </Link>
  );
};

import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useSubscriptionAlert } from '@/stores/subscription.store';

// Notificação flutuante de fatura vencida — aparece em qualquer página
// do tenant (exceto na própria Assinatura) e leva ao pagamento.
export const SubscriptionAlert: React.FC = () => {
  const { hasOverdue, checked, check } = useSubscriptionAlert();
  const location = useLocation();

  useEffect(() => { check(); }, [check]);

  if (!checked || !hasOverdue) return null;
  if (location.pathname === '/assinatura') return null;

  return (
    <Link
      to="/assinatura"
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
        background: 'var(--danger)',
        color: '#fff',
        fontSize: '0.8125rem',
        fontWeight: 600,
        textDecoration: 'none',
        boxShadow: '0 8px 24px rgba(220, 38, 38, 0.35)',
        animation: 'slideUp 0.25s ease',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <AlertTriangle size={16} />
      Fatura vencida — pagar assinatura
    </Link>
  );
};

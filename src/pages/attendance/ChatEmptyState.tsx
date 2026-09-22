import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useThemeStore } from '@/stores/theme.store';

export const ChatEmptyState: React.FC = () => {
  const { logoUrl, logoText } = useThemeStore(s => s.activeTheme);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        background: 'var(--bg-secondary, #f8fafc)',
        padding: 40,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
      `}</style>

      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary-light, #ede9fe), var(--primary-lighter, #f3f0ff))',
          border: '2px solid var(--primary-border, #ddd6fe)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(124,58,237,0.12)',
          animation: 'pulse-slow 3s ease-in-out infinite',
          overflow: 'hidden',
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={logoText || 'Logo'}
            style={{ width: '70%', height: '70%', objectFit: 'contain' }}
          />
        ) : (
          <MessageCircle size={44} color="var(--primary, #7c3aed)" strokeWidth={1.5} />
        )}
      </div>

      <div style={{ textAlign: 'center', maxWidth: 280 }}>
        <p
          style={{
            fontSize: '1.0625rem',
            fontWeight: 600,
            color: 'var(--text-primary, #1e293b)',
            margin: '0 0 6px',
          }}
        >
          Nenhuma conversa selecionada
        </p>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-muted, #94a3b8)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Clique em um chat para iniciar uma conversa
        </p>
      </div>
    </div>
  );
};

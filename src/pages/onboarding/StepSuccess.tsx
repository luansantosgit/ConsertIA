import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PartyPopper, Copy, Check, LogIn, KeyRound, AlertTriangle } from 'lucide-react';
import type { OnboardingCredentials } from './onboarding.repository';

export const StepSuccess: React.FC<{
  credentials: OnboardingCredentials;
  companyName: string;
}> = ({ credentials, companyName }) => {
  const navigate = useNavigate();
  const [entering, setEntering] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const enter = async () => {
    if (entering) return;
    setEntering(true);
    setError(null);
    try {
      const { useAuthStore } = await import('@/stores/auth.store');
      const result = await useAuthStore.getState().login(credentials.email, credentials.temp_password);
      if (result.success) {
        navigate('/atendimento', { replace: true });
      } else {
        setError('Não foi possível entrar automaticamente. Use o e-mail e a senha acima em /login.');
      }
    } catch {
      setError('Não foi possível entrar automaticamente. Use o e-mail e a senha acima em /login.');
    } finally {
      setEntering(false);
    }
  };

  const Field: React.FC<{ label: string; value: string; copyKey: string; secret?: boolean }> = ({ label, value, copyKey, secret }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      padding: '12px 14px', background: 'var(--bg-secondary, #f8fafc)',
      border: '1px solid var(--border)', borderRadius: 10,
    }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', margin: 0 }}>
          {label}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: secret ? 'monospace' : undefined }}>
          {value}
        </p>
      </div>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => copy(value, copyKey)}
        style={{ flexShrink: 0 }}
      >
        {copied === copyKey ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 68, height: 68, borderRadius: '50%', margin: '0 auto 16px',
        background: '#16a34a', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 12px 32px rgba(22, 163, 74, 0.3)',
        animation: 'slideUp 0.3s ease',
      }}>
        <PartyPopper size={32} />
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px' }}>
        Tudo pronto, {companyName}! 🎉
      </h2>
      <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', margin: '0 0 24px' }}>
        Pagamento confirmado, empresa ativa e seu agente de IA já respondendo no WhatsApp.
        Guarde seus dados de acesso:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', maxWidth: 360, margin: '0 auto 20px' }}>
        <Field label="E-mail (login)" value={credentials.email} copyKey="email" />
        <Field label="Senha temporária" value={credentials.temp_password} copyKey="pass" secret />
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0 0 20px' }}>
        <KeyRound size={12} />
        Você pode trocar a senha depois dentro do painel, em Configurações.
      </p>

      {error && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0 0 12px' }}>
          <AlertTriangle size={14} /> {error}
        </p>
      )}

      <button className="btn btn-primary" onClick={enter} disabled={entering} style={{ fontSize: '1rem', padding: '14px 32px', borderRadius: 12 }}>
        <LogIn size={18} /> {entering ? 'Entrando...' : 'Acessar meu painel'}
      </button>
      <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '10px 0 0' }}>
        Você vai direto para a área de atendimento.
      </p>
    </div>
  );
};

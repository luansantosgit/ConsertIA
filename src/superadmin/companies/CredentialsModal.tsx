import React, { useState } from 'react';
import { CheckCircle2, Copy, X } from 'lucide-react';
import type { Credentials } from './types';

interface Props {
  credentials: Credentials | null;
  onClose: () => void;
}

const TITLES: Record<Credentials['kind'], string> = {
  created: 'Empresa criada! 🎉',
  reset: 'Senha regerada! 🔑',
  finalized: 'Cadastro finalizado! 🎉',
};

const SUCCESS_MESSAGES: Record<Credentials['kind'], (company: string) => string> = {
  created: (company) => `${company} foi criada e salva com sucesso.`,
  reset: (company) => `Nova senha gerada para o administrador de ${company}.`,
  finalized: (company) => `Cadastro de ${company} finalizado com sucesso.`,
};

const HINTS: Record<Credentials['kind'], string> = {
  created: 'Compartilhe as informações abaixo com o administrador da empresa para o primeiro acesso:',
  reset: 'A senha anterior deixa de funcionar. Compartilhe os novos dados de acesso:',
  finalized: 'O pagamento foi confirmado e a empresa foi ativada. Envie estes dados de acesso ao cliente:',
};

export const CredentialsModal: React.FC<Props> = ({ credentials, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!credentials) return null;

  const close = () => {
    setCopied(false);
    onClose();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Acesso ao sistema:\nE-mail: ${credentials.email}\nSenha: ${credentials.password}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* noop */ }
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3 className="modal-title">{TITLES[credentials.kind]}</h3>
          <button className="btn btn-ghost btn-icon" onClick={close}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--success-bg)', border: '1px solid var(--success)', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
            <CheckCircle2 size={18} color="var(--success)" />
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--success-text)', margin: 0 }}>
              {SUCCESS_MESSAGES[credentials.kind](credentials.company)}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              {HINTS[credentials.kind]}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: '10px 12px', background: 'var(--hover-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>E-mail</p>
                <p style={{ fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: 600, margin: 0 }}>{credentials.email}</p>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--hover-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>
                  {credentials.kind === 'reset' ? 'Nova senha' : 'Senha (gerada automaticamente)'}
                </p>
                <p style={{ fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: 600, margin: 0, color: 'var(--primary-text)' }}>
                  {credentials.password}
                </p>
              </div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={copy}>
            {copied ? <><CheckCircle2 size={15} /> Copiado!</> : <><Copy size={15} /> Copiar informações de acesso</>}
          </button>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
            Recomendamos que o administrador altere a senha no primeiro acesso.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={close}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

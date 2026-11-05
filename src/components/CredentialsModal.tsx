import React, { useState } from 'react';
import { CheckCircle2, Copy, X } from 'lucide-react';

/** Dados de acesso exibidos ao usuario para copiar/compartilhar. */
export interface CredentialsData {
  email: string;
  password: string;
}

/** Textos exibidos no modal (variam conforme o fluxo). */
export interface CredentialsModalConfig {
  title: string;
  successMessage: string;
  hint: string;
  passwordLabel?: string;
  footnote?: string;
}

interface CredentialsModalProps {
  credentials: CredentialsData | null;
  config: CredentialsModalConfig;
  onClose: () => void;
}

/**
 * Modal de credenciais: exibe e-mail + senha para o admin compartilhar
 * com o usuario. Reaproveitado no fluxo de criacao de empresa, regerar
 * senha, finalizar wizard e renovar senha de usuario.
 */
export const CredentialsModal: React.FC<CredentialsModalProps> = ({
  credentials,
  config,
  onClose,
}) => {
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
    } catch { /* clipboard bloqueado: segue sem copiar */ }
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3 className="modal-title">{config.title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={close} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--success-bg)', border: '1px solid var(--success)', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
            <CheckCircle2 size={18} color="var(--success)" />
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--success-text)', margin: 0 }}>
              {config.successMessage}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{config.hint}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: '10px 12px', background: 'var(--hover-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>E-mail</p>
                <p style={{ fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: 600, margin: 0 }}>{credentials.email}</p>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--hover-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>
                  {config.passwordLabel ?? 'Senha (gerada automaticamente)'}
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
            {config.footnote ?? 'Recomendamos que o administrador altere a senha no primeiro acesso.'}
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={close}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

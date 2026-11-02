import React, { useEffect, useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { APP_VERSION_LABEL } from '@/lib/version';
import { useTranslation } from '@/hooks/useTranslation';
import { PushSetupRow } from './PushSetupRow';
import { ChangePasswordForm } from './ChangePasswordForm';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

/** Modal "Sobre": identidade do app, versão atual e acesso rápido à senha. */
export const AboutModal: React.FC<AboutModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setPasswordOpen(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal about-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('Sobre')}
        onClick={event => event.stopPropagation()}
      >
        <div className="modal-header">
          <span className="modal-title">{t('Sobre')}</span>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label={t('Fechar')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body about-body">
          <img src="/icons/icon-192.png" alt={t('DeeperIA')} className="about-logo" />
          <strong className="about-name">DeeperIA</strong>
          <p className="about-description">{t('CRM + IA para assistência técnica')}</p>
          <span className="badge badge-primary about-version">{APP_VERSION_LABEL}</span>
          <PushSetupRow />
          <div className="about-row">
            <div className="about-row-info">
              <span className="about-row-label">{t('Alterar senha')}</span>
              <span className="about-row-hint">
                {passwordOpen
                  ? t('Defina uma nova senha para o seu acesso')
                  : t('Trocar a senha do seu acesso')}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setPasswordOpen(v => !v)}
              aria-expanded={passwordOpen}
            >
              <KeyRound size={15} /> {passwordOpen ? t('Fechar') : t('Alterar senha')}
            </button>
          </div>
          {passwordOpen && (
            <div style={{ padding: '0 2px' }}>
              <ChangePasswordForm submitLabel={t('Salvar')} />
            </div>
          )}
        </div>

        <div className="modal-footer about-footer">
          Feito com carinho por Grupo LS Soluções ❤
        </div>
      </div>
    </div>
  );
};

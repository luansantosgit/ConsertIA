import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { APP_VERSION_LABEL } from '@/lib/version';
import { useTranslation } from '@/hooks/useTranslation';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

/** Modal "Sobre": identidade do app e versão atual. */
export const AboutModal: React.FC<AboutModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
        </div>

        <div className="modal-footer about-footer">
          Feito com carinho por Grupo LS Soluções ❤
        </div>
      </div>
    </div>
  );
};

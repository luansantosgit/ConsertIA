import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { getPushPermissionState, subscribePush, setAppBadge } from '@/lib/push';
import type { PushPermissionState } from '@/lib/push';

interface PushPermissionModalProps {
  open: boolean;
  onClose: () => void;
  onSubscribed?: () => void;
}

/**
 * Modal solicitando permissao de notificacoes push.
 * Mostrado apenas uma vez; se o usuario negar, nao reaparece
 * (preferencia guardada em localStorage).
 */
export const PushPermissionModal: React.FC<PushPermissionModalProps> = ({
  open,
  onClose,
  onSubscribed,
}) => {
  const { t } = useTranslation();
  const [subscribing, setSubscribing] = useState(false);
  const [permission, setPermission] = useState<PushPermissionState>('default');

  const handleSubscribe = useCallback(async () => {
    setSubscribing(true);
    try {
      const result = await subscribePush();
      if (result.ok) {
        setAppBadge(0);
        onSubscribed?.();
        onClose();
      } else {
        // Falha de subsrcricao: ainda pode pedir permissao depois
        console.warn('Push subscribe falhou:', result.error);
      }
    } finally {
      setSubscribing(false);
    }
  }, [onClose, onSubscribed]);

  useEffect(() => {
    setPermission(getPushPermissionState());
  }, [open]);

  if (!open) return null;

  const alreadyDenied = permission === 'denied';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('Notificacoes')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span className="modal-title">{t('Receber notificacoes?')}</span>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label={t('Fechar')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p>{t('Quer receber lembretes de novas mensagens e compromissos?')}</p>
          {alreadyDenied && (
            <p className="text-xs text-muted">
              {t('Voce pode ativar nas configuracoes do navegador a qualquer momento.')}
            </p>
          )}
        </div>

        <div className="modal-footer">
          {alreadyDenied ? (
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('Fechar')}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={subscribing}
              >
                {t('Nao, obrigado')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubscribe}
                disabled={subscribing}
              >
                {subscribing ? t('Ativando...') : t('Permitir')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

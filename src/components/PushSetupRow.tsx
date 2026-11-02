import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import {
  subscribePush,
  disablePush,
  isPushAvailable,
  isPushActive,
  isPushEnabledByUser,
  getPushPermissionState,
} from '@/lib/push';

/**
 * Linha de configuracao de notificacoes push no modal "Sobre".
 * So existe em PWA mobile (aqui o push faz sentido). Permite o usuario
 * ativar depois ter recusado o modal de permissao, ou desativar quando quiser.
 *
 * O toggle reflete a REALIDADE (permissao do navegador + subscription
 * ativa) — nunca apenas a flag do localStorage, senao vira uma mascara
 * quando o navegador revoga a permissao.
 */
export const PushSetupRow: React.FC = () => {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Sincroniza com o estado real ao abrir o modal (o componente e
  // montado de novo a cada abertura — efeito so na montagem).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const active = await isPushActive();
      if (cancelled) return;
      setEnabled(active);
      // Flag ligada mas sem permissao/subscription = mascarando
      if (!active && isPushEnabledByUser()) {
        setNote(
          getPushPermissionState() === 'denied'
            ? t('Permissao negada — libere as notificacoes nas configuracoes do navegador.')
            : t('Permissao revogada pelo sistema — ative nas configuracoes do navegador.'),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activate = useCallback(async () => {
    setBusy(true);
    setNote(null);
    try {
      const result = await subscribePush();
      // Estado real, nao o que o subscribe(): o navegador pode ter negado
      const active = result.ok && (await isPushActive());
      setEnabled(active);
      if (!active) {
        setNote(
          result.error === 'Permissao negada pelo usuario'
            ? t('Permissao negada — libere as notificacoes nas configuracoes do navegador.')
            : (result.error ?? t('Nao foi possivel ativar agora.')),
        );
      }
    } finally {
      setBusy(false);
    }
  }, [t]);

  const deactivate = useCallback(async () => {
    setBusy(true);
    setNote(null);
    try {
      const result = await disablePush();
      setEnabled(false);
      if (!result.ok) setNote(result.error ?? null);
    } finally {
      setBusy(false);
    }
  }, []);

  if (!isPushAvailable()) return null;

  return (
    <div className="about-row">
      <div className="about-row-info">
        <span className="about-row-label">{t('Notificacoes')}</span>
        <span className="about-row-hint">
          {enabled ? t('Ativas neste dispositivo') : t('Desativadas neste dispositivo')}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={t('Notificacoes')}
        className={`about-switch${enabled ? ' on' : ''}`}
        onClick={enabled ? deactivate : activate}
        disabled={busy}
      >
        <span className="about-switch-knob" />
      </button>
      {note && <p className="about-row-note">{note}</p>}
    </div>
  );
};

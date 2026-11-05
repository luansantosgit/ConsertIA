import React, { useEffect, useState } from 'react';
import { Smartphone, Globe } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { isMobilePhone, isStandalonePwa, PWA_INSTALLED_KEY } from '@/lib/pwa';

const KEY_ATTEMPTED = 'deeperia:app-redirect-attempted';
const KEY_DISMISSED = 'deeperia:app-redirect-dismissed';
const FRESH_DAYS = 90 * 24 * 60 * 60 * 1000;

/**
 * Impede o usuario de usar o sistema pelo browser quando o PWA já está
 * instalado no celular (evita confusão de ter dois "apps").
 *
 * - No Android o WebAPK registra intent filters da origem: navegar para uma
 *   URL in-scope no browser abre o app. Fazemos UMA tentativa por sessão.
 * - Se o navegador continuar (fallback), mostramos uma tela explicando
 *   como abrir o app, com escapatória "continuar no navegador".
 * - iOS não expõe detecção do PWA instalado — nenhum redirect é feito lá.
 */
export const OpenAppGate: React.FC = () => {
  const { t } = useTranslation();
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    if (!isMobilePhone() || isStandalonePwa()) return;
    try {
      if (sessionStorage.getItem(KEY_DISMISSED) === '1') return;
      const installed = Number(localStorage.getItem(PWA_INSTALLED_KEY) ?? 0);
      if (!(installed > Date.now() - FRESH_DAYS)) return;
      if (sessionStorage.getItem(KEY_ATTEMPTED) === '1') {
        setShowSheet(true);
        return;
      }
      // Tentativa única: o recload só acontece se o Android NÃO abrir o app
      sessionStorage.setItem(KEY_ATTEMPTED, '1');
      window.location.replace(window.location.href);
    } catch {
      // storage bloqueado: não interfere na navegação
    }
  }, []);

  const openApp = () => {
    // Toque real do usuário: navegando in-scope o Android abre o WebAPK.
    window.location.href = window.location.href;
  };

  const keepBrowser = () => {
    try {
      sessionStorage.setItem(KEY_DISMISSED, '1');
    } catch {
      // segue sem marca
    }
    setShowSheet(false);
  };

  if (!showSheet) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" style={{ zIndex: 2200 }}>
      <div className="modal openapp-sheet">
        <img src="/icons/icon-192.png" alt={t('DeeperIA')} className="openapp-logo" />
        <h2 className="openapp-title">{t('Abra pelo app instalado')}</h2>
        <p className="openapp-text">
          {t('O DeeperIA está instalado na sua tela inicial. Use o app para ter notificações e o badge de mensagens.')}
        </p>
        <button type="button" className="btn btn-primary openapp-btn" onClick={openApp}>
          <Smartphone size={18} />
          {t('Abrir o app')}
        </button>
        <button type="button" className="openapp-continue" onClick={keepBrowser}>
          <Globe size={15} />
          {t('Continuar no navegador')}
        </button>
      </div>
    </div>
  );
};

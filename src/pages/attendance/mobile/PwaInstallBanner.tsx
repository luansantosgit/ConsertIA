import React, { useEffect, useState } from 'react';
import { Download, X, Share, PlusCircle, MoreVertical, Smartphone } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { usePwaInstall } from '@/hooks/usePwaInstall';

const DISMISS_KEY = 'deeperia:install-banner-dismissed';

/**
 * Balão de instalação do PWA no topo da lista de conversas (mobile).
 * - App já instalado (standalone): não mostra nada
 * - Chrome/Android com prompt nativo: botão dispara o prompt direto
 * - iOS/otros: modal com as instruções "Adicionar à Tela de Início"
 */
export const PwaInstallBanner: React.FC = () => {
  const { t } = useTranslation();
  const { canInstall, isStandalone, platform, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [showInstructions, setShowInstructions] = useState(false);

  // Se o usuário instalar pelo prompt nativo, esconde o balão na hora
  useEffect(() => {
    if (isStandalone) setShowInstructions(false);
  }, [isStandalone]);

  // Menu ⋮ (iOS, sem prompt nativo) pede para abrir as instruções
  useEffect(() => {
    const openHelp = () => setShowInstructions(true);
    window.addEventListener('deeperia:open-install-help', openHelp);
    return () => window.removeEventListener('deeperia:open-install-help', openHelp);
  }, []);

  if (isStandalone || dismissed) return null;

  const handleInstall = async () => {
    if (canInstall) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        localStorage.setItem(DISMISS_KEY, '1');
        setDismissed(true);
        return;
      }
      // dismissed/unavailable: mostra o caminho manual
    }
    setShowInstructions(true);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <>
      <div className="m-install-banner" role="banner">
        <div className="m-install-icon"><Smartphone size={18} /></div>
        <div className="m-install-text">
          <strong>{t('Instale o DeeperIA')}</strong>
          <span>{t('Acesse o chat direto da tela inicial do celular')}</span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleInstall}>
          <Download size={13} />{t('Instalar app')}
        </button>
        <button
          className="btn btn-ghost btn-icon"
          onClick={handleDismiss}
          aria-label={t('Dispensar')}
          title={t('Dispensar')}
          style={{ width: 28, height: 28, flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      </div>

      {showInstructions && (
        <div className="modal-overlay" onClick={() => setShowInstructions(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <h3 className="modal-title">{t('Como instalar')}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowInstructions(false)}>
                <span style={{ fontSize: 16 }}>&times;</span>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {platform === 'ios' ? (
                <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.875rem' }}>
                  <li>{t('Toque no botão')} <strong>Share</strong> <Share size={13} style={{ verticalAlign: -2 }} /> {t('na barra do Safari')}</li>
                  <li>{t('Escolha')} <strong>{t('Adicionar à Tela de Início')}</strong> <PlusCircle size={13} style={{ verticalAlign: -2 }} /></li>
                  <li>{t('Toque em')} <strong>Add</strong></li>
                </ol>
              ) : (
                <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.875rem' }}>
                  <li>{t('Toque no menu')} <MoreVertical size={13} style={{ verticalAlign: -2 }} /> {t('do navegador')}</li>
                  <li>{t('Escolha')} <strong>{t('Instalar aplicativo')}</strong></li>
                  <li>{t('Confirme a instalação')}</li>
                </ol>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowInstructions(false)}>{t('Entendi')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

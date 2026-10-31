import React, { useEffect, useState } from 'react';
import { PushPermissionModal } from './PushPermissionModal';
import { getPushPermissionState, isPushSupported } from '@/lib/push';

const STORAGE_KEY = 'deeperia:push-asked';
const SHOW_DELAY_MS = 2500;

/**
 * Decide quando pedir permissao de notificacoes:
 * - navegador suporta push
 * - usuario ainda nao respondeu (permissao 'default')
 * - nao perguntamos antes nesta instalacao (localStorage)
 * Mostra o modal apos um pequeno delay para nao competir com o load.
 */
export const PushPermissionGate: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (getPushPermissionState() !== 'default') return;
    if (localStorage.getItem(STORAGE_KEY) === '1') return;

    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, '1');
      setShow(true);
    }, SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return <PushPermissionModal open={show} onClose={() => setShow(false)} />;
};

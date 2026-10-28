import { useCallback, useEffect, useReducer, useState } from 'react';
import { canInstallPwa, promptInstallPwa, subscribePwa } from '@/lib/pwa';

export type PwaPlatform = 'ios' | 'android' | 'other';

function detectPlatform(): PwaPlatform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

function detectStandalone(): boolean {
  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standaloneQuery.matches || iosStandalone;
}

/**
 * Estado da instalação do PWA para componentes:
 * - `isStandalone`: app já instalado (não mostra nada)
 * - `canInstall`: prompt nativo capturado (Android/Chrome/Edge) — o evento
 *   é capturado no boot pelo lib/pwa.ts, antes de qualquer componente montar
 * - iOS nunca dispara o prompt: usa as instruções "Adicionar à Tela de Início"
 */
export function usePwaInstall() {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const [isStandalone, setIsStandalone] = useState<boolean>(detectStandalone);
  const [platform] = useState<PwaPlatform>(detectPlatform);

  useEffect(() => {
    const unsubscribe = subscribePwa(forceUpdate);
    const mql = window.matchMedia('(display-mode: standalone)');
    const onDisplayChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches || detectStandalone());
    };
    mql.addEventListener('change', onDisplayChange);
    return () => {
      unsubscribe();
      mql.removeEventListener('change', onDisplayChange);
    };
  }, [forceUpdate]);

  const promptInstall = useCallback(() => promptInstallPwa(), []);

  return { canInstall: canInstallPwa(), isStandalone, platform, promptInstall };
}

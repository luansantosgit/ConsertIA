import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

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
 * Instalação do PWA:
 * - `isStandalone`: app já está instalado (não mostra nada)
 * - `canInstall`: browser disparou o prompt nativo (Android/Chrome)
 * - iOS não dispara beforeinstallprompt: usa as instruções de "Adicionar à Tela de Início"
 */
export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(detectStandalone);
  const [platform] = useState<PwaPlatform>(detectPlatform);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    const mql = window.matchMedia('(display-mode: standalone)');
    const onDisplayChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches || detectStandalone());
    };
    mql.addEventListener('change', onDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      mql.removeEventListener('change', onDisplayChange);
    };
  }, []);

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!promptEvent) return 'unavailable';
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') setPromptEvent(null);
    return outcome;
  };

  return { canInstall: promptEvent !== null, isStandalone, platform, promptInstall };
}

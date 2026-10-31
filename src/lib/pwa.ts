/**
 * Captura do evento `beforeinstallprompt` no boot do app.
 *
 * O evento costuma disparar ANTES de qualquer componente React montar
 * (e o listener antigo vivia dentro do componente do menu/banner) —
 * perdia o evento e o Android caía no fluxo de instruções manuais.
 * Aqui o listener é registrado uma única vez, no import do módulo
 * (chamado no main.tsx), e os componentes apenas consultam o estado.
 */

export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

/** localStorage com a marca "PWA instalado" (gravada no app standalone). */
export const PWA_INSTALLED_KEY = 'deeperia:installed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(l => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
}

/** Registra o listener na inicialização do app (main.tsx). */
export function initPwaCapture(): void {
  // O listener já é registrado no import do módulo; esta função existe
  // para tornar a intenção explícita e legível no ponto de entrada.
}

export function subscribePwa(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function canInstallPwa(): boolean {
  return deferredPrompt !== null;
}

/** Dispara o prompt nativo de instalação (Android/Chrome/Edge). */
export async function promptInstallPwa(): Promise<PwaInstallOutcome> {
  if (!deferredPrompt) return 'unavailable';
  const event = deferredPrompt;
  deferredPrompt = null;
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    notify();
    return outcome;
  } catch {
    return 'unavailable';
  }
}

/** true quando o app roda como PWA instalado/standalone (Android e iOS). */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** true em celular real (Android/iOS) — tela estreita de desktop não conta. */
export function isMobilePhone(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
  return /Android/.test(ua) || ios;
}

/**
 * Marca que o app está instalado (chamado no boot quando standalone).
 * No Android o WebAPK compartilha storage com o Chrome: essa marca é o
 * sinal que o browser usa para redirecionar de volta ao app (OpenAppGate).
 */
export function markPwaInstalled(): void {
  if (!isStandalonePwa()) return;
  try {
    localStorage.setItem(PWA_INSTALLED_KEY, String(Date.now()));
  } catch {
    // storage indisponível: sem marca, sem redirect — não é crítico
  }
}

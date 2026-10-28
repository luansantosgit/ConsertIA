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

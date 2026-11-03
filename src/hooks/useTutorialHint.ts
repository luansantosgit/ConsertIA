import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/** Marca persistida: o usuário já acessou o tutorial (não mostra mais). */
const SEEN_KEY = 'deeperia:training-seen';
/** Tempo parado na mesma página até convidar o usuário para o tutorial. */
export const TUTORIAL_HINT_DELAY_MS = 5000;

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* storage indisponível (modo privado) — o balão apenas volta */
  }
}

export interface TutorialHintState {
  /** O balão de dica deve aparecer? */
  show: boolean;
  /** Marca o tutorial como acessado (o balão não volta). */
  markSeen: () => void;
}

/**
 * Balão de dica do tutorial (issue #103).
 * - aparece depois de 5s parado na MESMA página (o timer reinicia a cada navegação);
 * - some para sempre depois que o usuário acessa o tutorial.
 */
export function useTutorialHint(): TutorialHintState {
  const { pathname } = useLocation();
  const [seen, setSeen] = useState(readSeen);
  const [elapsed, setElapsed] = useState(0);

  // Abriu o portal → tutorial já acessado.
  useEffect(() => {
    if (!pathname.startsWith('/treinamento')) return;
    writeSeen();
    setSeen(true);
  }, [pathname]);

  // 5s sem navegar na mesma página → mostra a dica.
  useEffect(() => {
    setElapsed(0);
    const id = setTimeout(() => setElapsed(TUTORIAL_HINT_DELAY_MS), TUTORIAL_HINT_DELAY_MS);
    return () => clearTimeout(id);
  }, [pathname]);

  const markSeen = () => {
    writeSeen();
    setSeen(true);
  };

  return { show: !seen && elapsed >= TUTORIAL_HINT_DELAY_MS, markSeen };
}

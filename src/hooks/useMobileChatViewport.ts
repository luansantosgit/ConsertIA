import { useEffect } from 'react';

const MOBILE_QUERY = '(max-width: 768px)';

/**
 * Cola o shell do chat mobile na ÁREA VISÍVEL (Issue #85).
 *
 * Ao focar o input, Android/iOS abrem o teclado virtual sem encolher o
 * layout viewport: o navegador rola a página para revelar o campo, o que
 * empurra o header para fora e expõe uma faixa branca embaixo.
 *
 * Aqui a altura/topo do shell seguem o `visualViewport` (que já desconta
 * o teclado) e qualquer scroll do documento é desfeito. Resultado: o
 * header permanece no topo, o input sobe logo acima do teclado e tudo
 * volta à posição original quando o teclado fecha.
 */
export function useMobileChatViewport(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const root = document.documentElement;
    const body = document.body;
    const viewport = window.visualViewport;
    const mql = window.matchMedia(MOBILE_QUERY);

    root.classList.add('m-shell');
    body.classList.add('m-shell');

    const resetDocumentScroll = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    const apply = () => {
      if (!mql.matches) {
        root.style.removeProperty('--app-height');
        root.style.removeProperty('--app-top');
        return;
      }
      // Pinch-zoom altera height/offsetTop do visualViewport em CSS px;
      // nesse caso não mexe no layout (acessibilidade).
      if (viewport && viewport.scale !== 1) return;

      const height = Math.floor(viewport?.height ?? window.innerHeight);
      const top = Math.max(0, Math.floor(viewport?.offsetTop ?? 0));
      root.style.setProperty('--app-height', `${height}px`);
      root.style.setProperty('--app-top', `${top}px`);
      resetDocumentScroll();
    };

    apply();
    viewport?.addEventListener('resize', apply);
    viewport?.addEventListener('scroll', apply);
    window.addEventListener('orientationchange', apply);
    mql.addEventListener('change', apply);

    return () => {
      viewport?.removeEventListener('resize', apply);
      viewport?.removeEventListener('scroll', apply);
      window.removeEventListener('orientationchange', apply);
      mql.removeEventListener('change', apply);
      root.classList.remove('m-shell');
      body.classList.remove('m-shell');
      root.style.removeProperty('--app-height');
      root.style.removeProperty('--app-top');
    };
  }, [enabled]);
}

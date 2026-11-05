import { useEffect, useState } from 'react';

// Mesmo breakpoint consagrado do app (sidebar off-canvas no styles.css)
const QUERY = '(max-width: 768px)';

/** Detecta telas mobile (<=768px) de forma reativa via matchMedia. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

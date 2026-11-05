import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const LANGS = [
  { code: 'pt-BR', flag: '🇧🇷', label: 'PT', name: 'Português (BR)' },
  { code: 'en', flag: '🇺🇸', label: 'EN', name: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'ES', name: 'Español' },
] as const;

/** Seletor de idioma do header (dropdown com clique fora). */
export const LanguageSwitcher: React.FC = () => {
  const { language, changeLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGS.find((l) => l.code === language) ?? LANGS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="header-icon-btn"
        id="lang-switcher-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Trocar idioma"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '6px 10px', borderRadius: 8,
          width: 'auto', fontSize: '0.8125rem', fontWeight: 600,
          border: '1px solid var(--border)',
          background: open ? 'var(--input-bg)' : 'transparent',
        }}
      >
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>{current.flag}</span>
        <span>{current.label}</span>
        <ChevronDown
          size={13}
          style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          minWidth: 140, overflow: 'hidden', zIndex: 200,
          animation: 'slideUp 0.15s ease',
        }}>
          {LANGS.map((lang) => (
            <button
              key={lang.code}
              id={`lang-${lang.code}`}
              onClick={() => { changeLanguage(lang.code); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 14px',
                border: 'none', background: language === lang.code ? 'var(--primary-light)' : 'transparent',
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '0.875rem', fontWeight: language === lang.code ? 600 : 400,
                color: language === lang.code ? 'var(--primary-text)' : 'var(--text-primary)',
                textAlign: 'left', transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                if (language !== lang.code) (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)';
              }}
              onMouseLeave={(e) => {
                if (language !== lang.code) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: '1.125rem' }}>{lang.flag}</span>
              <span>{lang.name}</span>
              {language === lang.code && (
                <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

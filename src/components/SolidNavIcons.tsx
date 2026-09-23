import React from 'react';

interface SolidIconProps {
  size?: number;
  active?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// When active: icon is over the primary-color background → use white
// When inactive: use primary CSS variable so it tracks theme changes
const getColors = (active: boolean) => ({
  base:     active ? '#ffffff' : '#475569',
  accent:   active ? 'rgba(255,255,255,0.85)' : 'var(--primary)',
  contrast: active ? 'var(--primary)' : '#ffffff',
  muted:    active ? 'rgba(255,255,255,0.5)' : '#94a3b8',
});

export const SolidDashboardIcon: React.FC<SolidIconProps> = ({ size = 20, active = false, className = '', style = {} }) => {
  const { base, accent } = getColors(active);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
      <rect x="3" y="3" width="8" height="8" rx="2" fill={base} />
      <rect x="13" y="3" width="8" height="5" rx="2" fill={accent} />
      <rect x="3" y="13" width="8" height="8" rx="2" fill={base} />
      <rect x="13" y="10" width="8" height="11" rx="2" fill={base} />
      <circle cx="17" cy="15" r="1.5" fill={accent} />
    </svg>
  );
};

export const SolidAtendimentoIcon: React.FC<SolidIconProps> = ({ size = 20, active = false, className = '', style = {} }) => {
  const { base, accent, contrast } = getColors(active);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
      <path
        d="M3 5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-4.5L6 17v-3H6a3 3 0 0 1-3-3V5Z"
        fill={base}
      />
      <path
        d="M17.5 13.5a2.5 2.5 0 0 1 3.5 0c1 1 1 2.5 0 3.5l-3.5 3.5-3.5-3.5c-1-1-1-2.5 0-3.5a2.5 2.5 0 0 1 3.5 0Z"
        fill={accent}
      />
      <circle cx="7.5" cy="8" r="1.2" fill={contrast} />
      <circle cx="10.5" cy="8" r="1.2" fill={contrast} />
      <circle cx="13.5" cy="8" r="1.2" fill={contrast} />
    </svg>
  );
};

export const SolidOrdensIcon: React.FC<SolidIconProps> = ({ size = 20, active = false, className = '', style = {} }) => {
  const { base, accent, contrast, muted } = getColors(active);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
      <rect x="4" y="4" width="16" height="17" rx="3" fill={base} />
      <rect x="8" y="2" width="8" height="4" rx="1.5" fill={accent} />
      <rect x="7" y="9" width="10" height="2" rx="1" fill={muted} />
      <rect x="7" y="13" width="7" height="2" rx="1" fill={muted} />
      <circle cx="16.5" cy="15.5" r="3.5" fill={accent} />
      <path d="m15 15.5 1 1 2-2" stroke={contrast} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const SolidClientesIcon: React.FC<SolidIconProps> = ({ size = 20, active = false, className = '', style = {} }) => {
  const { base, accent } = getColors(active);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
      <path d="M4 19a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1H4v-1Z" fill={base} />
      <circle cx="10" cy="8" r="4" fill={base} />
      <circle cx="17.5" cy="7.5" r="2.8" fill={accent} />
      <path d="M15 17a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1h-8v-1Z" fill={accent} />
    </svg>
  );
};

export const SolidEstoqueIcon: React.FC<SolidIconProps> = ({ size = 20, active = false, className = '', style = {} }) => {
  const { base, accent } = getColors(active);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" fill={base} />
      <path d="M12 3 20.5 7.5 12 12 3.5 7.5 12 3Z" fill={accent} />
      <path d="M10 6.5 14 8.5v6l-4-2v-6Z" fill={base} opacity="0.3" />
      <rect x="9" y="14" width="6" height="3" rx="1" fill={accent} />
    </svg>
  );
};

export const SolidFinanceiroIcon: React.FC<SolidIconProps> = ({ size = 20, active = false, className = '', style = {} }) => {
  const { base, accent, contrast } = getColors(active);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
      <rect x="3" y="5" width="18" height="14" rx="3" fill={base} />
      <rect x="2" y="7" width="15" height="10" rx="2" fill={base} />
      <circle cx="16" cy="12" r="4.5" fill={accent} />
      <path d="M16 9.5v5M14.5 10.5h2.5a1 1 0 0 1 0 2h-2a1 1 0 0 0 0 2h2.5" stroke={contrast} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
};

export const SolidAgendaIcon: React.FC<SolidIconProps> = ({ size = 20, active = false, className = '', style = {} }) => {
  const { base, accent, contrast } = getColors(active);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
      <rect x="3" y="6" width="18" height="15" rx="3" fill={base} />
      <path d="M3 9a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2H3V9Z" fill={accent} />
      <rect x="7" y="3" width="2" height="4" rx="1" fill={base} />
      <rect x="15" y="3" width="2" height="4" rx="1" fill={base} />
      <circle cx="14" cy="15" r="3.5" fill={accent} />
      <path d="M14 13.5v1.8l1.2.7" stroke={contrast} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
};

export const SolidRelatoriosIcon: React.FC<SolidIconProps> = ({ size = 20, active = false, className = '', style = {} }) => {
  const { base, accent } = getColors(active);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
      <rect x="3" y="14" width="4.5" height="7" rx="1.5" fill={base} />
      <rect x="9.5" y="9" width="4.5" height="12" rx="1.5" fill={base} />
      <rect x="16" y="4" width="4.5" height="17" rx="1.5" fill={accent} />
      <polygon points="12,4 15,7 13.5,7 13.5,9 10.5,9 10.5,7 9,7" fill={accent} />
    </svg>
  );
};

export const SolidAgenteIaIcon: React.FC<SolidIconProps> = ({ size = 20, active = false, className = '', style = {} }) => {
  const { base, accent, contrast } = getColors(active);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
      <rect x="4" y="6" width="16" height="13" rx="3.5" fill={base} />
      <rect x="11" y="2" width="2" height="4" rx="1" fill={accent} />
      <circle cx="12" cy="2" r="1.5" fill={accent} />
      <rect x="2" y="10" width="2" height="5" rx="1" fill={accent} />
      <rect x="20" y="10" width="2" height="5" rx="1" fill={accent} />
      <circle cx="8.5" cy="11.5" r="2" fill={accent} />
      <circle cx="15.5" cy="11.5" r="2" fill={accent} />
      <rect x="8.5" y="15.5" width="7" height="1.8" rx="0.9" fill={contrast} />
    </svg>
  );
};

export const SolidConfiguracoesIcon: React.FC<SolidIconProps> = ({ size = 20, active = false, className = '', style = {} }) => {
  const { base, accent } = getColors(active);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
      <path
        d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.5 3.2-.8-.4a8.2 8.2 0 0 0-.6-1.5l.4-.8a1 1 0 0 0-.2-1.2l-1.4-1.4a1 1 0 0 0-1.2-.2l-.8.4a8.2 8.2 0 0 0-1.5-.6l-.4-.8a1 1 0 0 0-1-.7h-2a1 1 0 0 0-1 .7l-.4.8a8.2 8.2 0 0 0-1.5.6l-.8-.4a1 1 0 0 0-1.2.2L6.1 6.9a1 1 0 0 0-.2 1.2l.4.8c-.2.5-.5 1-.6 1.5l-.8.4a1 1 0 0 0-.7 1v2a1 1 0 0 0 .7 1l.8.4c.1.5.4 1 .6 1.5l-.4.8a1 1 0 0 0 .2 1.2l1.4 1.4a1 1 0 0 0 1.2.2l.8-.4c.5.2 1 .5 1.5.6l.4.8a1 1 0 0 0 1 .7h2a1 1 0 0 0 1-.7l.4-.8c.5-.1 1-.4 1.5-.6l.8.4a1 1 0 0 0 1.2-.2l1.4-1.4a1 1 0 0 0 .2-1.2l-.4-.8c.2-.5.5-1 .6-1.5l.8-.4a1 1 0 0 0 .7-1v-2a1 1 0 0 0-.7-1Z"
        fill={base}
      />
      <circle cx="12" cy="12" r="2.5" fill={accent} />
    </svg>
  );
};

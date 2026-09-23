import React from 'react';

interface ActionIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// Chat bubble — verde WhatsApp fixo (identidade do canal)
export const SolidActionChat: React.FC<ActionIconProps> = ({ size = 16, className = '', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
    <path
      d="M3 5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-5L7 21v-4H6a3 3 0 0 1-3-3V5Z"
      fill="#10b981"
    />
    <circle cx="8" cy="10" r="1.5" fill="#ffffff" />
    <circle cx="12" cy="10" r="1.5" fill="#ffffff" />
    <circle cx="16" cy="10" r="1.5" fill="#ffffff" />
  </svg>
);

// Lápis — usa var(--primary) para acompanhar o tema
export const SolidActionEdit: React.FC<ActionIconProps> = ({ size = 16, className = '', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
    <path d="m14.1 3.3 6.6 6.6-11 11H3.1v-6.6l11-11Z" fill="var(--primary, #4f46e5)" />
    <path d="m16.5 2.1 4.2 4.2-2.1 2.1-4.2-4.2 2.1-2.1Z" fill="rgba(255,255,255,0.45)" />
    <polygon points="3.1,20.9 5.5,20.9 3.1,18.5" fill="#1e293b" />
  </svg>
);

// Lixeira — vermelho fixo (ação destrutiva, identidade universal)
export const SolidActionTrash: React.FC<ActionIconProps> = ({ size = 16, className = '', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
    <rect x="9" y="2" width="6" height="3" rx="1.5" fill="#ef4444" />
    <rect x="3" y="5" width="18" height="3" rx="1.5" fill="#ef4444" />
    <path d="M5 8h14l-1.5 13a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 8Z" fill="#ef4444" />
    <rect x="9" y="10" width="1.8" height="8" rx="0.9" fill="#ffffff" opacity="0.6" />
    <rect x="13.2" y="10" width="1.8" height="8" rx="0.9" fill="#ffffff" opacity="0.6" />
  </svg>
);

// Telefone — usa var(--primary)
export const SolidActionPhone: React.FC<ActionIconProps> = ({ size = 14, className = '', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
    <path
      d="M6.6 2.5C7.2 1.8 8.3 1.8 9 2.4l3.1 2.8c.7.6.8 1.7.3 2.5l-1.6 2.4c-.3.5-.3 1.1 0 1.6 1.1 1.9 2.7 3.5 4.6 4.6.5.3 1.1.3 1.6 0l2.4-1.6c.8-.5 1.9-.4 2.5.3l2.8 3.1c.6.7.6 1.8-.1 2.4l-2.4 2.4c-1.2 1.2-3 1.6-4.6 1-4.7-1.8-8.7-5.8-10.5-10.5-.6-1.6-.2-3.4 1-4.6l2.4-2.4Z"
      fill="var(--primary, #0284c7)"
    />
  </svg>
);

// Email — cinza neutro (não é ação primária)
export const SolidActionMail: React.FC<ActionIconProps> = ({ size = 14, className = '', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
    <rect x="2" y="4" width="20" height="16" rx="3" fill="#64748b" />
    <path d="M2 7l10 7 10-7" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Pin/localização — usa var(--primary)
export const SolidActionPin: React.FC<ActionIconProps> = ({ size = 14, className = '', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
    <path
      d="M12 2a8 8 0 0 0-8 8c0 5.2 7 11.4 7.4 11.7.3.3.9.3 1.2 0 .4-.3 7.4-6.5 7.4-11.7a8 8 0 0 0-8-8Z"
      fill="var(--primary, #0284c7)"
    />
    <circle cx="12" cy="10" r="3" fill="#ffffff" />
  </svg>
);

// Busca — usa var(--primary)
export const SolidActionSearch: React.FC<ActionIconProps> = ({ size = 15, className = '', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
    <circle cx="11" cy="11" r="7.5" fill="var(--primary, #64748b)" opacity="0.8" />
    <circle cx="11" cy="11" r="5" fill="#ffffff" opacity="0.25" />
    <rect x="16" y="15" width="7" height="3" rx="1.5" transform="rotate(45 16 15)" fill="#334155" />
  </svg>
);

// Impressora — usa var(--primary)
export const SolidActionPrint: React.FC<ActionIconProps> = ({ size = 14, className = '', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
    <path d="M6 9V3h12v6" fill="#64748b" />
    <rect x="3" y="9" width="18" height="9" rx="3" fill="#334155" />
    <rect x="6" y="14" width="12" height="7" rx="1" fill="#ffffff" />
    <circle cx="17" cy="12" r="1.2" fill="var(--primary, #0284c7)" />
  </svg>
);

// Mais (+) — usa var(--primary) para ações de criação
export const SolidActionPlus: React.FC<ActionIconProps> = ({ size = 14, className = '', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
    <circle cx="12" cy="12" r="10" fill="var(--primary, #4f46e5)" />
    <path d="M12 7v10M7 12h10" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// Filtro — usa var(--primary)
export const SolidActionFilter: React.FC<ActionIconProps> = ({ size = 14, className = '', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
    <path d="M3 4h18l-7 9v6l-4-2v-4L3 4Z" fill="var(--primary, #4f46e5)" opacity="0.9" />
  </svg>
);

// Olho / visualizar — neutro
export const SolidActionView: React.FC<ActionIconProps> = ({ size = 14, className = '', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flexShrink: 0, ...style }}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" fill="var(--primary, #4f46e5)" />
    <circle cx="12" cy="12" r="3" fill="#ffffff" />
  </svg>
);

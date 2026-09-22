import React from 'react';
import { Phone, FileText, PanelRightClose, PanelRightOpen } from 'lucide-react';
import type { ConvRow } from './types';

interface ChatHeaderProps {
  selected: ConvRow | undefined;
  isRightPanelOpen: boolean;
  onOpenOSModal: () => void;
  onToggleRightPanel: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  selected,
  isRightPanelOpen,
  onOpenOSModal,
  onToggleRightPanel,
}) => {
  const [imgError, setImgError] = React.useState(false);
  const avatarUrl = selected?.contactAvatar || selected?.contact_avatar;
  const showAvatar = !!avatarUrl && !imgError;

  // Reset img error state when selected conversation changes
  React.useEffect(() => {
    setImgError(false);
  }, [selected?.id, avatarUrl]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      borderBottom: '1px solid var(--border)',
      background: '#fff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: showAvatar ? 'transparent' : 'var(--primary-light)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '0.9375rem',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {showAvatar ? (
            <img
              key={avatarUrl}
              src={avatarUrl}
              alt={selected?.contactName || ''}
              onError={() => setImgError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            selected?.contactName?.charAt(0) || '?'
          )}
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{selected?.contactName}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {selected?.contact_phone} · <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{selected?.deviceInfo}</span>
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <a
          href={`tel:${selected?.contact_phone?.replace(/\D/g, '')}`}
          className="btn btn-secondary btn-sm"
          style={{ textDecoration: 'none' }}
        >
          <Phone size={13} />Ligar
        </a>
        <button className="btn btn-primary btn-sm" onClick={onOpenOSModal}>
          <FileText size={13} />Abrir OS
        </button>
        <button
          className="btn btn-secondary btn-icon"
          onClick={onToggleRightPanel}
          title={isRightPanelOpen ? 'Recolher detalhes do cliente' : 'Expandir detalhes do cliente'}
          style={{ borderRadius: 8, width: 34, height: 34 }}
        >
          {isRightPanelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      </div>
    </div>
  );
};
import React from 'react';

interface ClientProfileProps {
  contactName: string;
  contactPhone: string;
  contactAvatar?: string;
}

export const ClientProfile: React.FC<ClientProfileProps> = ({
  contactName,
  contactPhone,
  contactAvatar,
}) => {
  const [imgError, setImgError] = React.useState(false);
  const showAvatar = !!contactAvatar && !imgError;

  React.useEffect(() => {
    setImgError(false);
  }, [contactAvatar]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: showAvatar ? 'transparent' : 'var(--primary-light)',
        color: 'var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: '1.25rem',
        margin: '0 auto 8px',
        overflow: 'hidden',
      }}>
        {showAvatar ? (
          <img
            key={contactAvatar}
            src={contactAvatar}
            alt={contactName}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          contactName.charAt(0)
        )}
      </div>
      <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{contactName}</p>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{contactPhone}</p>
    </div>
  );
};
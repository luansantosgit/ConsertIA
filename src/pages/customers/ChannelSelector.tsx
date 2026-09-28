import React from 'react';
import { Smartphone, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Connection } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface ChannelSelectorProps {
  loading: boolean;
  connections: Connection[];
  selectedConnId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export const ChannelSelector: React.FC<ChannelSelectorProps> = ({
  loading,
  connections,
  selectedConnId,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (loading) {
    return <div style={{ padding: 12, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('Carregando...')}</div>;
  }

  if (connections.length === 0) {
    return (
      <div style={{ padding: 12, borderRadius: 8, border: '1px dashed var(--border)', background: 'var(--surface-secondary)', fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{t('Nenhuma conexão configurada')}</span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.75rem', gap: 4 }}
          onClick={() => { onClose(); navigate('/configuracoes?tab=conexoes'); }}
        >
          {t('Conectar')} <ExternalLink size={12} />
        </button>
      </div>
    );
  }

  if (connections.length === 1) {
    return (
      <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-secondary)' }}>
        <Smartphone size={16} style={{ color: 'var(--primary)' }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{connections[0].name || 'WhatsApp'}</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{connections[0].phone_number || connections[0].provider}</p>
        </div>
        <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>{t('Conectado')}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {connections.map(conn => (
        <label
          key={conn.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            borderRadius: 8, border: `2px solid ${selectedConnId === conn.id ? 'var(--primary)' : 'var(--border)'}`,
            background: selectedConnId === conn.id ? 'var(--primary-light)' : 'var(--surface)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          <input
            type="radio"
            name="chat_channel"
            checked={selectedConnId === conn.id}
            onChange={() => onSelect(conn.id)}
            style={{ accentColor: 'var(--primary)' }}
          />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: selectedConnId === conn.id ? 'var(--primary)' : 'var(--text-primary)' }}>
              {conn.name || 'WhatsApp'}
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {conn.phone_number || conn.provider}
            </p>
          </div>
        </label>
      ))}
    </div>
  );
};

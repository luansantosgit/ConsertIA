import React from 'react';
import { FileText } from 'lucide-react';
import type { OSRow } from '@/components/OSModal';
import { formatOSCode, formatCurrency } from '@/lib/format';
import type { ChatMessage } from './types';

interface MessageOSCardProps {
  osCard: NonNullable<ChatMessage['osCard']>;
  from: ChatMessage['from'];
  osList: OSRow[];
  onViewPdfOS: (os: OSRow) => void;
}

export const MessageOSCard: React.FC<MessageOSCardProps> = ({
  osCard,
  from,
  osList,
  onViewPdfOS,
}) => {
  const isAttendant = from === 'attendant';

  return (
    <div
      style={{
        marginTop: 10,
        background: isAttendant ? 'rgba(255, 255, 255, 0.12)' : '#f8fafc',
        border: isAttendant ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '12px',
        color: isAttendant ? '#fff' : '#0f172a',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={16} />
          <strong style={{ fontSize: '0.875rem' }}>{formatOSCode(osCard.osId)}</strong>
        </div>
        <span className="badge badge-primary" style={{ background: '#fff', color: 'var(--primary)' }}>
          {osCard.status.toUpperCase()}
        </span>
      </div>
      <p style={{ fontSize: '0.8125rem', margin: '0 0 4px 0', opacity: 0.9 }}>
        {osCard.equipment} · {osCard.subject}
      </p>
      {osCard.budget !== undefined && (
        <p style={{ fontSize: '0.9375rem', fontWeight: 800, margin: '4px 0 8px 0' }}>
          Valor Total: {formatCurrency(osCard.budget)}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={() => {
            const found = osList.find(o => o.id === osCard.osId);
            if (found) onViewPdfOS(found);
          }}
          style={{
            background: '#fff',
            color: 'var(--primary)',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Visualizar / Baixar PDF
        </button>
      </div>
    </div>
  );
};

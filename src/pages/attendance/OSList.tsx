import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Printer, Send, ExternalLink } from 'lucide-react';
import type { OSRow } from '@/components/OSModal';
import { formatOSCode, formatCurrency } from '@/lib/format';
import { STATUS_BADGE } from './types';

interface OSListProps {
  currentClientOSList: OSRow[];
  onOpenOSModal: () => void;
  onViewPdfOS: (os: OSRow) => void;
  onSendOSCardToChat: (os: OSRow) => void;
}

export const OSList: React.FC<OSListProps> = ({
  currentClientOSList,
  onOpenOSModal,
  onViewPdfOS,
  onSendOSCardToChat,
}) => {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Ordens de Serviço ({currentClientOSList.length})
        </p>
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--primary)', padding: 0, fontSize: '0.75rem', gap: 3 }}
          onClick={onOpenOSModal}
        >
          <Plus size={12} />Nova OS
        </button>
      </div>

      {currentClientOSList.length === 0 ? (
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Nenhuma OS cadastrada</p>
          <button
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', width: '100%', justifyContent: 'center' }}
            onClick={onOpenOSModal}
          >
            <Plus size={12} />Cadastrar OS para este cliente
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {currentClientOSList.map(os => {
            const st = STATUS_BADGE[os.status] || { label: os.status, badge: 'badge-gray' };
            return (
              <div
                key={os.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.8125rem' }}>{formatOSCode(os.id)}</span>
                  <span className={`badge ${st.badge}`} style={{ fontSize: '0.6875rem' }}>{st.label}</span>
                </div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {os.subject}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>{os.equipmentLabel}</span>
                  {os.budget_amount && (
                    <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(os.budget_amount)}</strong>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, paddingTop: 6, borderTop: '1px solid #e2e8f0' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, padding: '4px 6px', fontSize: '0.6875rem', justifyContent: 'center', gap: 4 }}
                    onClick={() => onViewPdfOS(os)}
                    title="Visualizar e Imprimir PDF"
                  >
                    <Printer size={12} /> Ver PDF
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: '0.6875rem',
                      justifyContent: 'center',
                      gap: 4,
                      background: '#ecfdf5',
                      color: '#065f46',
                      border: '1px solid #a7f3d0'
                    }}
                    onClick={() => onSendOSCardToChat(os)}
                    title="Enviar PDF no Chat com 1 Clique"
                  >
                    <Send size={12} /> Enviar Chat
                  </button>
                </div>
              </div>
            );
          })}
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--primary)', gap: 4 }}
            onClick={() => navigate('/app/ordens')}
          >
            Ver todas as OS no sistema <ExternalLink size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
import React from 'react';
import { Edit3, Trash2, Check, X, Zap } from 'lucide-react';
import type { OSRow } from '@/components/OSModal';
import type { ConvRow } from './types';
import { ClientProfile } from './ClientProfile';
import { ClientEditForm } from './ClientEditForm';
import { OSList } from './OSList';

interface ClientDetailsPanelProps {
  selected: ConvRow;
  currentClientOSList: OSRow[];
  isEditingClient: boolean;
  editForm: { contactName: string; contact_phone: string; deviceInfo: string; notes: string };
  onStartEdit: () => void;
  onSaveClient: () => void;
  onEditFormChange: (form: { contactName: string; contact_phone: string; deviceInfo: string; notes: string }) => void;
  onOpenOSModal: () => void;
  onViewPdfOS: (os: OSRow) => void;
  onSendOSCardToChat: (os: OSRow) => void;
  onSetInputText: (text: string) => void;
  onClose: () => void;
  onDelete?: () => void;
}

export const ClientDetailsPanel: React.FC<ClientDetailsPanelProps> = ({
  selected,
  currentClientOSList,
  isEditingClient,
  editForm,
  onStartEdit,
  onSaveClient,
  onEditFormChange,
  onOpenOSModal,
  onViewPdfOS,
  onSendOSCardToChat,
  onSetInputText,
  onClose,
  onDelete,
}) => {
  return (
    <div style={{
      width: 330,
      borderLeft: '1px solid var(--border)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      overflowY: 'auto',
      background: '#fff',
      flexShrink: 0,
      animation: 'fadeIn 0.15s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Detalhes</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!isEditingClient ? (
            <>
              <button
                className="btn btn-ghost btn-icon"
                onClick={onStartEdit}
                title="Editar informacoes"
                style={{ width: 28, height: 28 }}
              >
                <Edit3 size={14} />
              </button>
              {onDelete && (
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={onDelete}
                  title="Excluir conversa"
                  style={{ width: 28, height: 28, color: 'var(--danger)' }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={onSaveClient}
              style={{ gap: 4, padding: '4px 8px', fontSize: '0.75rem' }}
            >
              <Check size={13} />Salvar
            </button>
          )}
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            title="Recolher painel"
            style={{ width: 28, height: 28 }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {isEditingClient ? (
        <ClientEditForm editForm={editForm} onFormChange={onEditFormChange} />
      ) : (
        <ClientProfile
          contactName={selected.contactName}
          contactPhone={selected.contact_phone}
          contactAvatar={selected.contactAvatar || selected.contact_avatar}
        />
      )}

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

      <div>
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          Equipamento Principal
        </p>
        {!isEditingClient ? (
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{selected.deviceInfo}</p>
        ) : (
          <input
            className="input"
            style={{ fontSize: '0.8125rem', padding: '6px 10px' }}
            value={editForm.deviceInfo}
            onChange={e => onEditFormChange({ ...editForm, deviceInfo: e.target.value })}
            placeholder="Ex: iPhone 14 Pro"
          />
        )}
      </div>

      <div>
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          Observações do Lead
        </p>
        {!isEditingClient ? (
          <p style={{ fontSize: '0.8125rem', color: selected.notes ? 'var(--text-secondary)' : 'var(--text-muted)', fontStyle: selected.notes ? 'normal' : 'italic' }}>
            {selected.notes || 'Nenhuma observação interna informada.'}
          </p>
        ) : (
          <textarea
            className="textarea"
            rows={3}
            style={{ fontSize: '0.8125rem', padding: '6px 10px' }}
            value={editForm.notes}
            onChange={e => onEditFormChange({ ...editForm, notes: e.target.value })}
            placeholder="Notas internas..."
          />
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

      <OSList
        currentClientOSList={currentClientOSList}
        onOpenOSModal={onOpenOSModal}
        onViewPdfOS={onViewPdfOS}
        onSendOSCardToChat={onSendOSCardToChat}
      />

      <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
          Ações Rápidas de IA
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            'Gerar orçamento automático',
            'Notificar cliente via WhatsApp',
            'Marcar OS como urgente'
          ].map(action => (
            <button
              key={action}
              onClick={() => onSetInputText(action)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.75rem',
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #ddd6fe',
                background: '#fff',
                cursor: 'pointer',
                color: '#5b21b6',
                textAlign: 'left'
              }}
            >
              <Zap size={11} />{action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
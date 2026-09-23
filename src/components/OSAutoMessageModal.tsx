import React, { useState, useEffect } from 'react';
import { X, Bell, BellOff, Save } from 'lucide-react';
import type { StageAutoMessage } from '@/lib/os-auto-message.service';

interface OSAutoMessageModalProps {
  isOpen: boolean;
  stageLabel: string;
  initial: StageAutoMessage;
  saving: boolean;
  onSave: (cfg: StageAutoMessage) => void;
  onClose: () => void;
}

export const OSAutoMessageModal: React.FC<OSAutoMessageModalProps> = ({
  isOpen,
  stageLabel,
  initial,
  saving,
  onSave,
  onClose,
}) => {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEnabled(initial.enabled);
      setMessage(initial.message);
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Mensagem Automática</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Estágio: <strong>{stageLabel}</strong>
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>

        <div className="modal-body">
          <label
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10,
              cursor: 'pointer', background: enabled ? '#ecfdf5' : '#f8fafc',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {enabled
                ? <Bell size={18} color="#10b981" />
                : <BellOff size={18} color="var(--text-muted)" />}
              <div>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Envio automático
                </p>
                <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  Dispara no chat do lead 10s após a OS entrar neste estágio
                </p>
              </div>
            </div>
            <div
              onClick={() => setEnabled(v => !v)}
              role="switch"
              aria-checked={enabled}
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEnabled(v => !v); } }}
              style={{
                width: 44, height: 24, borderRadius: 99, padding: 2,
                background: enabled ? '#10b981' : '#cbd5e1',
                position: 'relative', flexShrink: 0, cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transform: enabled ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform 0.2s',
              }} />
            </div>
          </label>

          {enabled && (
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label">Mensagem enviada ao lead</label>
              <textarea
                className="textarea"
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Ex: Olá! Sua ordem de serviço entrou em análise. Assim que tivermos o diagnóstico, avisamos por aqui. 🔧"
                autoFocus
              />
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                A mensagem é enviada pelo WhatsApp e registrada no histórico do chat.
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={() => onSave({ enabled, message: message.trim() })}
            disabled={enabled && !message.trim() || saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

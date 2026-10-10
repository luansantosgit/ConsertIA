import { useEffect, useState } from 'react';
import { X, Save, RefreshCw, Webhook, Loader2 } from 'lucide-react';
import type { Connection } from '@/types';

interface ConnectionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: Connection | null;
  savingName: boolean;
  syncing: boolean;
  onRename: (name: string) => void;
  onSync: () => void;
  onReconfigureWebhook: () => void;
}

/** Modal de edição da conexão: renomear + ações extras (sync histórico, webhook) */
export function ConnectionEditModal({
  isOpen,
  onClose,
  connection,
  savingName,
  syncing,
  onRename,
  onSync,
  onReconfigureWebhook,
}: ConnectionEditModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen && connection) setName(connection.name || connection.phone_number || '');
  }, [isOpen, connection]);

  if (!isOpen || !connection) return null;

  const nameChanged = name.trim() !== (connection.name || '') && name.trim().length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3 className="modal-title">Editar conexão</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div>
            <label className="form-label">Nome da conexão</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: WhatsApp da loja"
              maxLength={80}
            />
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => onRename(name.trim())}
            disabled={!nameChanged || savingName}
          >
            {savingName ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {savingName ? 'Salvando...' : 'Salvar nome'}
          </button>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <p className="form-label" style={{ marginBottom: 10 }}>Ações</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onSync}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <RefreshCw size={14} />
                )}
                {syncing ? 'Sincronizando...' : 'Sincronizar histórico de mensagens'}
              </button>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: -4 }}>
                Busca mensagens antigas das últimas 30 conversas deste número.
              </p>
              <button className="btn btn-secondary btn-sm" onClick={onReconfigureWebhook}>
                <Webhook size={14} />
                Reconfigurar webhook
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

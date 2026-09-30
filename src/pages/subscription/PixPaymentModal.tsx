import React, { useState } from 'react';
import { Copy, Check, RefreshCw, X } from 'lucide-react';
import type { SubscriptionInvoice } from '@/repositories/subscription.repository';
import { fmtBRL, fmtDate } from './format';

// Modal de pagamento Pix: QR Code + copia e cola + verificação de pagamento
export const PixPaymentModal: React.FC<{
  open: boolean;
  invoice: SubscriptionInvoice | null;
  encodedImage: string | null;
  syncing: boolean;
  onClose: () => void;
  onSync: () => void;
}> = ({ open, invoice, encodedImage, syncing, onClose, onSync }) => {
  const [copied, setCopied] = useState(false);

  if (!open || !invoice) return null;

  const copy = () => {
    if (invoice.pix_payload) {
      navigator.clipboard.writeText(invoice.pix_payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3 className="modal-title">Pagar com Pix</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            {fmtBRL(Number(invoice.amount))} · vence em {fmtDate(invoice.due_date)}
          </p>
          {encodedImage ? (
            <div style={{
              padding: 12, background: '#fff', borderRadius: 12,
              border: '1px solid var(--border)', marginTop: 12,
            }}>
              <img
                src={`data:image/png;base64,${encodedImage}`}
                alt="QR Code Pix"
                style={{ width: 220, height: 220, display: 'block' }}
              />
            </div>
          ) : (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 12 }}>
              QR Code indisponível. Use o código copia e cola abaixo.
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 12 }}>
            <input
              className="input"
              readOnly
              value={invoice.pix_payload ?? ''}
              style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.6875rem' }}
            />
            <button className="btn btn-secondary" onClick={copy} disabled={!invoice.pix_payload}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <button className="btn btn-primary" onClick={onSync} disabled={syncing} style={{ marginTop: 12 }}>
            <RefreshCw size={14} style={syncing ? { animation: 'spin 1s linear infinite' } : undefined} />
            {syncing ? 'Verificando...' : 'Já paguei — verificar'}
          </button>
        </div>
      </div>
    </div>
  );
};

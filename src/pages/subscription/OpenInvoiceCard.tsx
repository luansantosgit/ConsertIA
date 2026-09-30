import React from 'react';
import { ExternalLink, RefreshCw, QrCode, AlertTriangle } from 'lucide-react';
import { BILLING_LABELS, type SubscriptionInvoice } from '@/repositories/subscription.repository';
import { fmtBRL, fmtDate, STATUS_BADGES, STATUS_LABELS } from './format';

// Fatura em aberto (pendente ou vencida) com ações por forma de pagamento
export const OpenInvoiceCard: React.FC<{
  invoice: SubscriptionInvoice;
  syncing: boolean;
  onShowPix: () => void;
  onSync: () => void;
}> = ({ invoice, syncing, onShowPix, onSync }) => {
  const overdue = invoice.status === 'overdue';

  return (
    <div
      className="card card-p"
      style={{
        display: 'flex', flexDirection: 'column', gap: 14,
        borderColor: overdue ? 'var(--danger)' : undefined,
        borderWidth: overdue ? 1.5 : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {overdue && <AlertTriangle size={16} color="var(--danger)" />}
            Fatura {overdue ? 'vencida' : 'em aberto'}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            {fmtBRL(Number(invoice.amount))} · {BILLING_LABELS[invoice.billing_type]} · vencimento {fmtDate(invoice.due_date)}
          </p>
        </div>
        <span className={STATUS_BADGES[invoice.status]}>{STATUS_LABELS[invoice.status]}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {invoice.billing_type === 'PIX' && (
          <button className="btn btn-primary" onClick={onShowPix}>
            <QrCode size={15} /> Ver QR Code Pix
          </button>
        )}
        {invoice.billing_type === 'BOLETO' && invoice.bank_slip_url && (
          <a className="btn btn-primary" href={invoice.bank_slip_url} target="_blank" rel="noreferrer">
            <ExternalLink size={15} /> Abrir boleto
          </a>
        )}
        {invoice.billing_type === 'CREDIT_CARD' && invoice.invoice_url && (
          <a className="btn btn-primary" href={invoice.invoice_url} target="_blank" rel="noreferrer">
            <ExternalLink size={15} /> Pagar com cartão
          </a>
        )}
        {invoice.invoice_url && invoice.billing_type !== 'CREDIT_CARD' && (
          <a className="btn btn-secondary" href={invoice.invoice_url} target="_blank" rel="noreferrer">
            <ExternalLink size={15} /> Fatura completa
          </a>
        )}
        <button className="btn btn-ghost" onClick={onSync} disabled={syncing}>
          <RefreshCw size={15} /> {syncing ? 'Verificando...' : 'Já paguei — verificar'}
        </button>
      </div>
    </div>
  );
};

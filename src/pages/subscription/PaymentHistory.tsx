import React from 'react';
import { Receipt } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { BILLING_LABELS, type SubscriptionInvoice } from '@/repositories/subscription.repository';
import { fmtBRL, fmtDate, STATUS_BADGES, STATUS_LABELS } from './format';

// Histórico de pagamentos (faturas pagas/canceladas)
export const PaymentHistory: React.FC<{ invoices: SubscriptionInvoice[] }> = ({ invoices }) => {
  const history = invoices.filter(i => i.status === 'paid' || i.status === 'canceled');

  return (
    <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 4px' }}>Histórico de pagamentos</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
          Todas as faturas de assinatura já processadas.
        </p>
      </div>

      {history.length === 0 ? (
        <EmptyState
          title="Nenhum pagamento ainda"
          description="Quando sua assinatura for paga, o histórico aparecerá aqui."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {history.map(inv => (
            <div
              key={inv.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'var(--primary-light)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Receipt size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '0.8125rem', margin: 0 }}>
                  {inv.plan_name} · {fmtBRL(Number(inv.amount))}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  {BILLING_LABELS[inv.billing_type]} · venc. {fmtDate(inv.due_date)}
                  {inv.paid_at ? ` · paga em ${fmtDate(inv.paid_at)}` : ''}
                </p>
              </div>
              <span className={STATUS_BADGES[inv.status]}>{STATUS_LABELS[inv.status]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

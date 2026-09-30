import React, { useState, useCallback, useEffect } from 'react';
import { CreditCard, QrCode, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { SkeletonCard } from '@/components/Skeleton';
import ErrorMessage from '@/components/ErrorMessage';
import {
  SubscriptionRepository,
  BILLING_LABELS,
  type SubscriptionOverview,
  type SubscriptionInvoice,
  type BillingType,
} from '@/repositories/subscription.repository';
import { useSubscriptionAlert } from '@/stores/subscription.store';
import { fmtBRL, fmtDate } from './format';
import { OpenInvoiceCard } from './OpenInvoiceCard';
import { PaymentHistory } from './PaymentHistory';
import { PixPaymentModal } from './PixPaymentModal';

const METHOD_ICONS: Record<BillingType, React.ComponentType<{ size?: number }>> = {
  PIX: QrCode,
  BOLETO: FileText,
  CREDIT_CARD: CreditCard,
};

const repo = new SubscriptionRepository();

export const SubscriptionPage: React.FC = () => {
  const { check: refreshAlert } = useSubscriptionAlert();
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<BillingType | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pixModal, setPixModal] = useState<{ invoice: SubscriptionInvoice; image: string | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await repo.getOverview());
    } catch {
      setError('Erro ao carregar assinatura');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleError = (err: Error & { code?: string; detail?: string }) => {
    const messages: Record<string, string> = {
      asaas_not_configured: 'Pagamentos ainda não configurados. Contate o suporte.',
      cnpj_missing: 'Cadastre o CNPJ da empresa em Configurações → Empresa para gerar cobranças.',
      method_not_enabled: 'Forma de pagamento não liberada pelo administrador.',
      asaas_error: err.detail ?? 'Falha na comunicação com o Asaas.',
    };
    setError(messages[err.code ?? ''] ?? 'Erro ao processar pagamento. Tente novamente.');
  };

  const openInvoice = overview?.invoices.find(i => i.status === 'pending' || i.status === 'overdue') ?? null;
  const allPaid = !!overview && !openInvoice && overview.invoices.some(i => i.status === 'paid');

  const handleCreate = async (method: BillingType) => {
    setCreating(method);
    setError(null);
    try {
      const result = await repo.createInvoice(method);
      const fresh = await repo.getOverview();
      setOverview(fresh);
      const current = result.reused
        ? fresh.invoices.find(i => i.status === 'pending' || i.status === 'overdue') ?? result.invoice
        : result.invoice;
      if (method === 'PIX') {
        setPixModal({ invoice: current, image: result.pix_encoded_image });
      } else if (method === 'BOLETO' && current.bank_slip_url) {
        window.open(current.bank_slip_url, '_blank');
      } else if (current.invoice_url) {
        window.open(current.invoice_url, '_blank');
      }
    } catch (err) {
      handleError(err as Error & { code?: string; detail?: string });
    } finally {
      setCreating(null);
    }
  };

  const handleShowPix = async () => {
    if (!openInvoice) return;
    setSyncing(true);
    try {
      const qr = await repo.getPixQr(openInvoice.id);
      setPixModal({ invoice: { ...openInvoice, pix_payload: qr.payload }, image: qr.encoded_image });
    } catch {
      setPixModal({ invoice: openInvoice, image: null });
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async (invoiceId: string) => {
    setSyncing(true);
    setError(null);
    try {
      const { invoice } = await repo.syncInvoice(invoiceId);
      if (invoice.status === 'paid') {
        setPixModal(null);
        refreshAlert();
      }
      await load();
    } catch {
      setError('Não foi possível verificar o pagamento agora. Tente novamente em instantes.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <SkeletonCard />;
  if (error && !overview) return <ErrorMessage message={error} onRetry={load} />;
  if (!overview) return null;

  const { plan, enabled_methods, asaas_configured, invoices, subscription } = overview;

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760, margin: '0 auto', width: '100%' }}>
      <div>
        <h2 style={{ fontWeight: 700, fontSize: '1.25rem', margin: 0 }}>Assinatura</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Detalhes do plano e pagamentos da sua assinatura.
        </p>
      </div>

      {subscription.blocked && (
        <div className="card card-p" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          borderColor: 'var(--danger)', borderWidth: 1.5,
          background: 'var(--danger-bg, #fef2f2)',
        }}>
          <AlertTriangle size={20} color="var(--danger)" />
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0, color: 'var(--danger)' }}>
              Sistema bloqueado — assinatura vencida
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Regularize o pagamento abaixo para liberar o acesso completo e o agente de IA.
            </p>
          </div>
        </div>
      )}

      {/* Plano atual */}
      <div className="card card-p" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Plano atual
          </p>
          <h3 style={{ fontWeight: 700, fontSize: '1.25rem', margin: '4px 0' }}>
            {plan?.name ?? 'Nenhum plano atribuído'}
          </h3>
          {plan && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
              {plan.features.slice(0, 3).join(' · ')}
            </p>
          )}
          {subscription.due_date && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '6px 0 0' }}>
              Vencimento em <strong>{fmtDate(subscription.due_date)}</strong>
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Mensalidade</p>
          <p style={{ fontWeight: 700, fontSize: '1.5rem', margin: 0, color: 'var(--primary)' }}>
            {plan ? fmtBRL(plan.price) : '—'}
          </p>
        </div>
      </div>

      {!asaas_configured ? (
        <div className="card card-p">
          <div className="empty-state">
            <div className="empty-state-icon"><CreditCard size={24} /></div>
            <p className="empty-state-title">Pagamentos não configurados</p>
            <p className="empty-state-desc">
              O administrador da plataforma ainda não configurou o gateway de pagamentos. Contate o suporte.
            </p>
          </div>
        </div>
      ) : openInvoice ? (
        <OpenInvoiceCard
          invoice={openInvoice}
          syncing={syncing}
          onShowPix={handleShowPix}
          onSync={() => handleSync(openInvoice.id)}
        />
      ) : (
        <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              {allPaid && <CheckCircle2 size={16} color="#16a34a" />}
              {allPaid ? 'Assinatura em dia' : 'Pagar assinatura'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
              Escolha uma forma de pagamento para gerar a cobrança do plano.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {enabled_methods.map(method => {
              const Icon = METHOD_ICONS[method];
              return (
                <button
                  key={method}
                  className="btn btn-secondary"
                  onClick={() => handleCreate(method)}
                  disabled={creating !== null}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px' }}
                >
                  <Icon size={16} />
                  {creating === method ? 'Gerando...' : BILLING_LABELS[method]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', margin: 0 }}>{error}</p>
      )}

      <PaymentHistory invoices={invoices} />

      <PixPaymentModal
        open={!!pixModal}
        invoice={pixModal?.invoice ?? null}
        encodedImage={pixModal?.image ?? null}
        syncing={syncing}
        onClose={() => setPixModal(null)}
        onSync={() => pixModal && handleSync(pixModal.invoice.id)}
      />
    </div>
  );
};

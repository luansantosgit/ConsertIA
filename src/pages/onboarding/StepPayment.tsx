import React, { useEffect, useRef, useState } from 'react';
import { QrCode, FileText, CreditCard, AlertTriangle, ExternalLink, RefreshCw, X } from 'lucide-react';
import { OnboardingRepository, type OnboardingPayment, type OnboardingCredentials, type BillingMethod } from './onboarding.repository';
import { fmtBRL } from './masks';

const repo = new OnboardingRepository();

const FIVE_MIN = 5 * 60;
const ALL_METHODS: Record<BillingMethod, { label: string; icon: React.ComponentType<{ size?: number }>; hint: string }> = {
  PIX: { label: 'Pix', icon: QrCode, hint: 'Aprovação imediata' },
  BOLETO: { label: 'Boleto', icon: FileText, hint: 'Até 2 dias úteis' },
  CREDIT_CARD: { label: 'Cartão', icon: CreditCard, hint: 'Aprovação imediata' },
};

const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const StepPayment: React.FC<{
  token: string;
  amount: number | null;
  payment: OnboardingPayment | null;
  expiredFromStart?: boolean;
  methods?: BillingMethod[];
  expiresAt?: string | null;
  onPaid: (credentials: OnboardingCredentials) => void;
  onRequestLeave?: () => void;
}> = ({
  token, amount, payment: initialPayment, expiredFromStart,
  methods, expiresAt, onPaid, onRequestLeave,
}) => {
  const [payment, setPayment] = useState<OnboardingPayment | null>(initialPayment);
  const [pixImage, setPixImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(FIVE_MIN);
  const [expired, setExpired] = useState(!!expiredFromStart);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<number | null>(null);
  const expireRef = useRef<number | null>(null);

  // Formas liberadas pelo superadmin (fallback: todas)
  const enabled = methods && methods.length > 0 ? methods : (Object.keys(ALL_METHODS) as BillingMethod[]);

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await repo.pollPayment(token);
        if (res.paid && res.credentials) {
          stopTimers();
          onPaid(res.credentials);
        }
      } catch { /* segue tentando */ }
    }, 5000);
  };

  const stopTimers = () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    if (expireRef.current) window.clearInterval(expireRef.current);
  };

  const choose = async (method: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await repo.createPayment(token, method);
      setPayment(res.payment);
      if (res.pix_encoded_image) setPixImage(res.pix_encoded_image);
      startPolling();
    } catch { /* methods enabled guard */ } finally {
      setLoading(false);
    }
  };

  // Countdown de 5 min → desconecta o canal
  useEffect(() => {
    if (expired || !payment) return;
    expireRef.current = window.setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          window.clearInterval(expireRef.current!);
          setExpired(true);
          stopTimers();
          repo.expirePayment(token).catch(() => {});
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return stopTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment, expired]);

  // Cobrança já existente (retomada) → polling + QR
  useEffect(() => {
    if (initialPayment) {
      startPolling();
      if (initialPayment.billing_type === 'PIX' && !initialPayment.pix_payload) {
        repo.getPix(token).then(r => setPixImage(r.encoded_image)).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const urgent = seconds <= 60;

  const copyPix = () => {
    if (payment?.pix_payload) {
      navigator.clipboard.writeText(payment.pix_payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {onRequestLeave && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={onRequestLeave}
          title="Sair do cadastro"
          aria-label="Sair do cadastro"
          style={{ position: 'absolute', top: -4, right: -4, padding: 6 }}
        >
          <X size={16} />
        </button>
      )}
      <h2 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 6px' }}>
        {expired ? 'Pagamento pendente' : 'Ative sua assinatura'}
      </h2>

      {!expired && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '10px 16px', borderRadius: 12, marginBottom: 18,
          background: urgent ? '#fef2f2' : 'var(--primary-light)',
          border: `1px solid ${urgent ? 'var(--danger)' : 'var(--primary)'}`,
        }}>
          <span style={{ fontSize: '0.8125rem', color: urgent ? 'var(--danger)' : 'var(--primary)', fontWeight: 600 }}>
            {amount ? fmtBRL(amount) : 'Valor do plano'} — pague em até
          </span>
          <strong style={{
            fontSize: '1.25rem', fontVariantNumeric: 'tabular-nums',
            color: urgent ? 'var(--danger)' : 'var(--primary)',
          }}>
            {mm}:{ss}
          </strong>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            · liberação imediata após pagamento
          </span>
        </div>
      )}

      {expired && (
        <div style={{
          display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14,
          background: '#fef2f2', border: '1.5px solid var(--danger)', borderRadius: 12, marginBottom: 18,
        }}>
          <AlertTriangle size={20} color="var(--danger)" style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
            <strong>Conexão cancelada por tempo esgotado.</strong> Efetue o pagamento até
            <strong> {fmtDateTime(expiresAt) || 'completar 24 horas'}</strong> — após esse prazo
            sua empresa será excluída automaticamente do sistema.
          </p>
        </div>
      )}

      {!payment ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {enabled.map(key => {
            const { label, icon: Icon, hint } = ALL_METHODS[key];
            return (
              <button
                key={key}
                className="btn btn-secondary"
                onClick={() => choose(key)}
                disabled={loading}
                style={{ justifyContent: 'space-between', padding: '16px 18px', fontSize: '0.9375rem' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={18} /> {label}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{hint}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {payment.billing_type === 'PIX' && (
            <>
              {pixImage && (
                <div style={{ padding: 10, background: '#fff', border: '1px solid var(--border)', borderRadius: 12 }}>
                  <img src={`data:image/png;base64,${pixImage}`} alt="QR Code Pix" style={{ width: 200, height: 200, display: 'block' }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <input className="input" readOnly value={payment.pix_payload ?? ''} style={{ fontFamily: 'monospace', fontSize: '0.6875rem' }} />
                <button className="btn btn-secondary" onClick={copyPix} disabled={!payment.pix_payload}>
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </>
          )}
          {payment.billing_type === 'BOLETO' && payment.bank_slip_url && (
            <a className="btn btn-primary" href={payment.bank_slip_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <ExternalLink size={16} /> Abrir boleto
            </a>
          )}
          {payment.billing_type === 'CREDIT_CARD' && payment.invoice_url && (
            <a className="btn btn-primary" href={payment.invoice_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <ExternalLink size={16} /> Pagar com cartão
            </a>
          )}
          {payment.invoice_url && payment.billing_type !== 'CREDIT_CARD' && (
            <a className="btn btn-ghost" href={payment.invoice_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', fontSize: '0.8125rem' }}>
              Fatura completa no Asaas
            </a>
          )}
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
            <RefreshCw size={12} style={{ animation: 'spin 2s linear infinite' }} />
            Verificando seu pagamento automaticamente...
          </p>
        </div>
      )}
    </div>
  );
};

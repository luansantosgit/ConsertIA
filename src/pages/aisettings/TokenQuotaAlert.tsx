import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Coins, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAiQuotaAlert } from '@/stores/ai-quota.store';
import { formatCurrency } from '@/lib/format';

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
}

interface PurchaseInfo {
  id: string;
  package_name: string;
  tokens: number;
  amount: number;
  invoice_url: string | null;
  pix_payload: string | null;
}

// Aviso de IA pausada (cota >= 110%) + compra de pacotes de tokens
// via Asaas com Pix — o valor pago vira saldo na cota da empresa.
export const TokenQuotaAlert: React.FC<{
  usageTokens: number;
  tokenLimit: number | null;
  onPurchased?: () => void;
  autoOpen?: boolean;
}> = ({ usageTokens, tokenLimit, onPurchased, autoOpen = false }) => {
  const { clear: clearGlobalAlert } = useAiQuotaAlert();
  const [open, setOpen] = useState(autoOpen);
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<{ info: PurchaseInfo; pixImage: string | null } | null>(null);
  const [polling, setPolling] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const percent = tokenLimit && tokenLimit > 0 ? (usageTokens / tokenLimit) * 100 : 0;
  const paused = percent >= 110;

  const stopPolling = useCallback(() => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('token_packages')
      .select('id, name, tokens, price')
      .eq('active', true)
      .order('sort_order');
    setPackages((data ?? []) as TokenPackage[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      setPurchase(null);
      setDone(false);
      setError(null);
      loadPackages();
    }
  }, [open, loadPackages]);

  const buy = async (pkg: TokenPackage) => {
    if (buyingId) return;
    setBuyingId(pkg.id);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('asaas-subscriptions', {
        body: { action: 'buy_tokens', package_id: pkg.id },
      });
      if (fnErr) {
        const ctx = (fnErr as { context?: Response }).context;
        let code = 'buy_failed';
        if (ctx) {
          try {
            const payload = await ctx.json();
            code = payload.error ?? code;
          } catch { /* mantém */ }
        }
        const messages: Record<string, string> = {
          asaas_not_configured: 'Pagamentos ainda não configurados. Contate o suporte.',
          invalid_package: 'Pacote indisponível. Tente novamente.',
          cnpj_missing: 'Cadastre o CNPJ da empresa em Configurações > Empresa.',
        };
        setError(messages[code] ?? 'Erro ao gerar cobrança. Tente novamente.');
        return;
      }
      const res = data as { purchase: PurchaseInfo; pix_encoded_image?: string | null };
      setPurchase({
        info: res.purchase,
        pixImage: res.pix_encoded_image ?? null,
      });
      // Polling automático do pagamento (5s)
      setPolling(true);
      const purchaseId = res.purchase.id;
      pollRef.current = window.setInterval(async () => {
        try {
          const pollRes = await supabase.functions.invoke('asaas-subscriptions', {
            body: { action: 'poll_tokens', purchase_id: purchaseId },
          });
          if ((pollRes.data as { paid?: boolean })?.paid) {
            stopPolling();
            setPolling(false);
            setDone(true);
            onPurchased?.();
            clearGlobalAlert();
          }
        } catch { /* segue verificando */ }
      }, 5000);
    } finally {
      setBuyingId(null);
    }
  };

  const checkNow = async () => {
    if (!purchase) return;
    setPolling(true);
    try {
      const res = await supabase.functions.invoke('asaas-subscriptions', {
        body: { action: 'poll_tokens', purchase_id: purchase.info.id },
      });
      if ((res.data as { paid?: boolean })?.paid) {
        stopPolling();
        setDone(true);
        onPurchased?.();
        clearGlobalAlert();
      }
    } finally {
      setPolling(false);
    }
  };

  if (!paused && !autoOpen) return null;

  return (
    <>
      {paused && (
        <div style={{
          display: 'flex', gap: 12, alignItems: 'center',
          padding: '14px 16px', background: '#fef2f2',
          border: '1.5px solid var(--danger)', borderRadius: 12,
        }}>
          <AlertTriangle size={20} color="var(--danger)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--danger)' }}>
              IA pausada — tokens esgotados
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              A cota do mês chegou a {Math.round(percent)}%. O agente de IA parou de responder
              até você comprar mais tokens.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)} style={{ flexShrink: 0 }}>
            <Coins size={14} /> Comprar tokens
          </button>
        </div>
      )}

      {open && (
        <div className="modal-overlay" onClick={() => { stopPolling(); setOpen(false); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">Comprar tokens de IA</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => { stopPolling(); setOpen(false); }} aria-label="Fechar"><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: 0 }}>{error}</p>}

              {!purchase && !done && (
                <>
                  {loading ? (
                    <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
                  ) : packages.length === 0 ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: 16 }}>
                      Nenhum pacote disponível no momento. Contate o suporte.
                    </p>
                  ) : (
                    packages.map(pkg => (
                      <button
                        key={pkg.id}
                        className="btn btn-secondary"
                        onClick={() => buy(pkg)}
                        disabled={buyingId !== null}
                        style={{ justifyContent: 'space-between', padding: '14px 16px' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Coins size={16} color="var(--primary)" />
                          <span style={{ textAlign: 'left' }}>
                            <strong>{pkg.name}</strong>
                            <br />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {pkg.tokens.toLocaleString('pt-BR')} tokens — creditados na hora após o Pix
                            </span>
                          </span>
                        </span>
                        <strong style={{ color: 'var(--primary)' }}>{formatCurrency(pkg.price)}</strong>
                      </button>
                    ))
                  )}
                </>
              )}

              {purchase && !done && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {purchase.info.package_name} · {purchase.info.tokens.toLocaleString('pt-BR')} tokens · {formatCurrency(purchase.info.amount)}
                  </p>
                  {purchase.pixImage && (
                    <div style={{ padding: 10, background: '#fff', border: '1px solid var(--border)', borderRadius: 12 }}>
                      <img src={`data:image/png;base64,${purchase.pixImage}`} alt="QR Code Pix" style={{ width: 200, height: 200, display: 'block' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                    <input className="input" readOnly value={purchase.info.pix_payload ?? ''} style={{ fontFamily: 'monospace', fontSize: '0.6875rem' }} />
                    <button
                      className="btn btn-secondary"
                      onClick={() => { if (purchase.info.pix_payload) navigator.clipboard.writeText(purchase.info.pix_payload); }}
                      disabled={!purchase.info.pix_payload}
                    >
                      Copiar
                    </button>
                  </div>
                  {purchase.info.invoice_url && (
                    <a className="btn btn-ghost" href={purchase.info.invoice_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', fontSize: '0.8125rem' }}>
                      Fatura completa no Asaas
                    </a>
                  )}
                  <button className="btn btn-primary" onClick={checkNow} disabled={polling}>
                    <RefreshCw size={14} style={polling ? { animation: 'spin 1s linear infinite' } : undefined} />
                    {polling ? 'Verificando...' : 'Já paguei — verificar'}
                  </button>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={10} style={{ animation: 'spin 2s linear infinite' }} />
                    Verificando automaticamente...
                  </p>
                </div>
              )}

              {done && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 700, fontSize: '0.9375rem', margin: '0 0 4px' }}>
                    Tokens creditados!
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                    O saldo já está na sua cota — a IA volta a responder em instantes.
                  </p>
                  <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setOpen(false)}>
                    Concluir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

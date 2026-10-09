import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Smartphone, Check } from 'lucide-react';
import { OnboardingRepository } from './onboarding.repository';

const repo = new OnboardingRepository();

// QR Code do WhatsApp + polling até conectar
export const StepWhatsapp: React.FC<{
  token: string;
  onConnected: (wantsHistorySync: boolean) => void;
  onBack: () => void;
}> = ({ token, onConnected, onBack }) => {
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [pollErrors, setPollErrors] = useState(0);
  const [checking, setChecking] = useState(false);
  const [wantSync, setWantSync] = useState(true);
  const wantSyncRef = useRef(true);
  const pollRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  const toggleSync = (value: boolean) => {
    setWantSync(value);
    wantSyncRef.current = value;
  };

  const loadQr = async () => {
    setLoading(true);
    setError(null);
    try {
      const { qr_code: qrCode } = await repo.connect(token);
      if (qrCode) setQr(qrCode);
      else setError('QR Code indisponível. Toque para tentar novamente.');
    } catch {
      setError('Não foi possível gerar o QR Code. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const checkNow = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const { connected: isConnected } = await repo.pollConnection(token);
      setPollErrors(0);
      if (isConnected) {
        setConnected(true);
        if (pollRef.current) window.clearInterval(pollRef.current);
        setTimeout(() => onConnected(wantSyncRef.current), 1800);
      }
    } catch {
      setPollErrors(e => e + 1);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // StrictMode monta o componente 2x em dev: guarda contra
    // criar duas instâncias Uazapi concorrentes
    if (startedRef.current) return;
    startedRef.current = true;
    loadQr();
    pollRef.current = window.setInterval(async () => {
      try {
        const { connected: isConnected } = await repo.pollConnection(token);
        setPollErrors(0);
        if (isConnected) {
          setConnected(true);
          if (pollRef.current) window.clearInterval(pollRef.current);
          setTimeout(() => onConnected(wantSyncRef.current), 1800);
        }
      } catch {
        // Falhas consecutivas viram aviso visível + botão manual
        setPollErrors(e => e + 1);
      }
    }, 2500);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div style={{ textAlign: 'center' }}>
      {connected ? (
        <div style={{ padding: '32px 0', animation: 'slideUp 0.3s ease' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Check size={32} />
          </div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, margin: '0 0 8px' }}>
            Conectado! 🎉
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Seu agente de IA já está funcionando neste WhatsApp.
          </p>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 6px' }}>
            Conecte seu WhatsApp
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', margin: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Smartphone size={16} /> Abra o WhatsApp → Aparelhos conectados → Escanear
          </p>

          <div style={{
            width: 260, height: 260, margin: '0 auto 16px', borderRadius: 16,
            border: '1px solid var(--border)', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            {loading && <div className="skeleton" style={{ width: '100%', height: '100%' }} />}
            {!loading && qr && (
              <img
                src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
                alt="QR Code WhatsApp"
                style={{ width: 240, height: 240 }}
              />
            )}
            {!loading && !qr && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', padding: 20 }}>{error}</p>
            )}
          </div>

          {error && qr === null && !loading && (
            <button className="btn btn-secondary btn-sm" onClick={loadQr}>
              <RefreshCw size={14} /> Gerar novo QR Code
            </button>
          )}

          {/* Toggle: sincronizar histórico após conectar */}
          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, margin: '18px auto 0', cursor: 'pointer',
            maxWidth: 340, userSelect: 'none',
          }}>
            <span style={{
              position: 'relative', display: 'inline-block', width: 40, height: 22, flexShrink: 0,
            }}>
              <input
                type="checkbox"
                checked={wantSync}
                onChange={e => toggleSync(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 11, transition: '0.3s',
                background: wantSync ? 'var(--primary)' : 'var(--border)',
              }}>
                <span style={{
                  position: 'absolute', top: 3, left: wantSync ? 21 : 3,
                  width: 16, height: 16, background: '#fff', borderRadius: '50%',
                  transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </span>
            </span>
            <span style={{ textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600 }}>
                Sincronizar histórico de mensagens
              </span>
              <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Traz as últimas conversas deste número para o sistema após conectar.
              </span>
            </span>
          </label>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 14 }}>
            Aguardando leitura do QR Code... mantenha esta aba aberta.
          </p>

          {pollErrors >= 4 && (
            <div style={{
              margin: '10px auto 0', padding: '10px 14px', maxWidth: 340,
              background: '#fef2f2', border: '1px solid var(--danger)', borderRadius: 10,
            }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--danger)' }}>
                Não estamos conseguindo verificar a conexão automaticamente.
                Já escaneou? Verifique agora:
              </p>
              <button className="btn btn-primary btn-sm" onClick={checkNow} disabled={checking} style={{ marginTop: 8 }}>
                <RefreshCw size={13} style={checking ? { animation: 'spin 1s linear infinite' } : undefined} />
                {checking ? 'Verificando...' : 'Já escanei — verificar'}
              </button>
            </div>
          )}
          <button className="btn btn-ghost" onClick={onBack} style={{ marginTop: 12 }}>Voltar</button>
        </>
      )}
    </div>
  );
};

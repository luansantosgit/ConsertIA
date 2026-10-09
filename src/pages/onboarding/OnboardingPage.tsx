import React, { useEffect, useState } from 'react';
import { OnboardingRepository, type OnboardingPlan, type OnboardingPayment, type OnboardingCredentials, type BillingMethod } from './onboarding.repository';
import { ConfirmModal } from '@/components/ConfirmModal';
import { HistorySyncOverlay } from '@/components/HistorySyncOverlay';
import { StepWelcome } from './StepWelcome';
import { StepCompanyData } from './StepCompanyData';
import { StepPlanChoice } from './StepPlanChoice';
import { StepWhatsapp } from './StepWhatsapp';
import { StepPayment } from './StepPayment';
import { StepSuccess } from './StepSuccess';

const TOKEN_KEY = 'deeperia-onboarding-token';
type Step = 'welcome' | 'data' | 'plan' | 'whatsapp' | 'payment' | 'success';

const STEP_ORDER: Step[] = ['welcome', 'data', 'plan', 'whatsapp', 'payment', 'success'];
const repo = new OnboardingRepository();

const fmtDateTime = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Wizard público de cadastro rápido (/comece-agora)
export const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState<Step>('welcome');
  const [token, setToken] = useState<string | null>(null);
  const [plan, setPlan] = useState<OnboardingPlan | null>(null);
  const [payment, setPayment] = useState<OnboardingPayment | null>(null);
  const [expiredPayment, setExpiredPayment] = useState(false);
  const [credentials, setCredentials] = useState<OnboardingCredentials | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [methods, setMethods] = useState<BillingMethod[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [resuming, setResuming] = useState(true);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');

  // Dispara a sincronização de histórico após conectar o WhatsApp
  const startHistorySync = (sessionToken: string) => {
    setSyncState('syncing');
    setSyncProgress(15);
    setSyncMessage('Buscando conversas recentes deste número...');
    repo.syncHistory(sessionToken)
      .then(res => {
        setSyncProgress(100);
        setSyncState('done');
        setSyncMessage(
          res.total === 0
            ? 'Nenhuma conversa anterior encontrada para sincronizar.'
            : `Sincronização solicitada para ${res.synced} de ${res.total} conversa(s)! As mensagens estão chegando.`,
        );
      })
      .catch(() => {
        setSyncProgress(100);
        setSyncState('error');
        setSyncMessage('Não foi possível sincronizar o histórico agora. Você pode tentar depois.');
      });
  };

  // Retomada: sessão em andamento após refresh
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) { setResuming(false); return; }
    repo.status(saved)
      .then(res => {
        setToken(saved);
        setCompanyName(res.company_name ?? '');
        setExpiresAt(res.expires_at ?? null);
        if (res.status === 'paid' && res.credentials) {
          setCredentials(res.credentials);
          setStep('success');
        } else if (res.status === 'awaiting_payment' || res.status === 'expired') {
          setPayment(res.payment);
          setExpiredPayment(true);
          setStep('payment');
        } else if (res.status === 'connected') {
          setPayment(res.payment);
          setStep('payment');
        } else if (res.plan) {
          setPlan(res.plan);
          setStep('whatsapp');
        } else {
          // Dados enviados, plano ainda não escolhido
          setStep('plan');
        }
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setResuming(false));
  }, []);

  const progress = STEP_ORDER.indexOf(step);
  const showProgress = step !== 'welcome' && step !== 'success';

  const onPlanChosen = async (p: OnboardingPlan, t: string) => {
    await repo.setPlan(t, p.id);
    setPlan(p);
    setStep('whatsapp');
  };

  const onDataDone = (t: string, sessionExpiresAt?: string) => {
    setToken(t);
    setExpiresAt(sessionExpiresAt ?? null);
    localStorage.setItem(TOKEN_KEY, t);
    setStep('plan');
  };

  const onPaid = (creds: OnboardingCredentials) => {
    setCredentials(creds);
    localStorage.removeItem(TOKEN_KEY);
    setStep('success');
  };

  // Guarda de saida durante o pagamento (refresh/fechar aba)
  useEffect(() => {
    if (step !== 'payment') return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [step]);

  if (resuming) {
    return (
      <OnboardingShell>
        <div className="skeleton" style={{ height: 240, borderRadius: 16 }} />
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell>
      {showProgress && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {['Dados', 'Plano', 'WhatsApp', 'Pagamento'].map((label, i) => {
            const idx = i + 1;
            const active = progress >= idx;
            return (
              <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{
                  height: 4, borderRadius: 2,
                  background: active ? 'var(--primary)' : 'var(--border)',
                  transition: 'background 0.3s',
                }} />
                <span style={{ fontSize: '0.625rem', fontWeight: 600, color: active ? 'var(--primary)' : 'var(--text-muted)', textAlign: 'center' }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {step === 'welcome' && <StepWelcome onStart={() => setStep('data')} />}
      {step === 'data' && (
        <StepCompanyData onDone={onDataDone} onBack={() => setStep('welcome')} />
      )}
      {step === 'plan' && token && (
        <StepPlanChoice
          token={token}
          onChoose={onPlanChosen}
          onMethodsLoaded={setMethods}
          onBack={() => setStep('data')}
        />
      )}
      {step === 'whatsapp' && token && (
        <StepWhatsapp
          token={token}
          onConnected={(wantsSync) => {
            setStep('payment');
            if (wantsSync) startHistorySync(token);
          }}
          onBack={() => setStep('plan')}
        />
      )}
      {step === 'payment' && token && (
        <StepPayment
          token={token}
          amount={plan?.price ?? payment?.amount ?? null}
          payment={payment}
          expiredFromStart={expiredPayment}
          methods={methods}
          expiresAt={expiresAt}
          onPaid={onPaid}
          onRequestLeave={() => setShowLeaveModal(true)}
        />
      )}
      {step === 'success' && credentials && (
        <StepSuccess credentials={credentials} companyName={companyName || 'sua empresa'} />
      )}

      {/* Aviso ao tentar sair durante o pagamento */}
      <ConfirmModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={() => {
          setShowLeaveModal(false);
          window.location.href = '/login';
        }}
        title="Sair do cadastro?"
        message={
          `Se sair agora, o cadastro só poderá ser concluído neste mesmo navegador. ` +
          `Se o pagamento não for confirmado até ${fmtDateTime(expiresAt)}, a empresa será ` +
          `excluída automaticamente do sistema.`
        }
        variant="warning"
      />

      <HistorySyncOverlay state={syncState} progress={syncProgress} message={syncMessage} />
    </OnboardingShell>
  );
};

const OnboardingShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #eef2ff 0%, #f8fafc 45%, #eef2ff 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  }}>
    <div className="card" style={{ maxWidth: 480, width: '100%', padding: 32, borderRadius: 20, boxShadow: '0 24px 64px rgba(79, 70, 229, 0.10)' }}>
      {children}
    </div>
  </div>
);

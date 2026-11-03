import React, { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { OnboardingRepository, type OnboardingPlan, type BillingMethod } from './onboarding.repository';
import { fmtBRL } from './masks';

const repo = new OnboardingRepository();

/** Texto de features que fala de tokens sai da lista: a cota real
 *  (plans.ai_token_limit) é exibida em destaque (Issue #98). */
const withoutTokenCopy = (features: string[]) =>
  features.filter(f => !/token/i.test(f));

const quotaLabel = (plan: OnboardingPlan): string => {
  const limit = plan.ai_token_limit;
  if (limit === undefined) return '';
  if (limit <= 0) return 'Tokens de IA ilimitados';
  return `${limit.toLocaleString('pt-BR')} tokens de IA/mês`;
};

export const StepPlanChoice: React.FC<{
  token: string;
  onChoose: (plan: OnboardingPlan, token: string) => Promise<void>;
  onMethodsLoaded?: (methods: BillingMethod[]) => void;
  onBack: () => void;
}> = ({ token, onChoose, onMethodsLoaded, onBack }) => {
  const [plans, setPlans] = useState<OnboardingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState<string | null>(null);

  useEffect(() => {
    repo.getPlans()
      .then(({ plans: list, enabled_methods: methods }) => {
        setPlans(list);
        onMethodsLoaded?.(methods ?? []);
      })
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 14 }} />)}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 6px' }}>
        Escolha seu plano
      </h2>
      <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', margin: '0 0 20px' }}>
        Comece hoje. Você pode trocar de plano quando quiser.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {plans.map(plan => (
          <button
            key={plan.id}
            onClick={() => {
              setChoosing(plan.id);
              onChoose(plan, token).catch(() => setChoosing(null));
            }}
            className="card"
            style={{
              textAlign: 'left', cursor: 'pointer', padding: 14,
              display: 'flex', flexDirection: 'column', gap: 8,
              borderColor: plan.featured ? 'var(--primary-text)' : 'var(--border)',
              borderWidth: plan.featured ? 1.5 : 1,
              background: plan.featured ? 'var(--primary-light)' : '#fff',
              transition: 'transform 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '1.0625rem' }}>{plan.name}</strong>
              {plan.featured && (
                <span className="badge badge-primary">Mais escolhido</span>
              )}
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-text)', margin: 0 }}>
              {fmtBRL(plan.price)}
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>/mês</span>
            </p>
            {quotaLabel(plan) && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)',
              }}>
                <Sparkles size={13} color="var(--primary-text)" style={{ flexShrink: 0 }} />
                {quotaLabel(plan)}
              </div>
            )}
            <ul style={{
              listStyle: 'none', padding: 0, margin: 0,
              display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '4px 10px',
            }}>
              {withoutTokenCopy(plan.features).slice(0, 6).map((f: string) => (
                <li key={f} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  <Check size={13} color="var(--primary-text)" style={{ flexShrink: 0, marginTop: 3 }} />
                  <span style={{ minWidth: 0 }}>{f}</span>
                </li>
              ))}
            </ul>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary-text)', fontWeight: 600 }}>
              {choosing === plan.id ? 'Registrando escolha...' : 'Escolher este plano →'}
            </span>
          </button>
        ))}
      </div>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginTop: 16 }}>Voltar</button>
    </div>
  );
};

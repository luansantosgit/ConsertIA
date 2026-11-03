import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StepPlanChoice } from '../StepPlanChoice';

const mockRepo = vi.hoisted(() => ({
  getPlans: vi.fn(),
}));

vi.mock('../onboarding.repository', () => ({
  OnboardingRepository: class {
    getPlans = mockRepo.getPlans;
  },
}));

/**
 * Issue #98: cada plano do wizard precisa mostrar a cota real de tokens
 * de IA (plans.ai_token_limit) — sem repetir o texto de features (que
 * pode estar desatualizado) e com as características em 2 colunas.
 */
describe('StepPlanChoice — cota de tokens de IA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.getPlans.mockResolvedValue({
      plans: [
        {
          id: 'starter',
          name: 'Starter',
          price: 69.9,
          featured: false,
          features: ['Até 3 usuários', '1.500.000 tokens de IA'],
          ai_token_limit: 1250000,
        },
        {
          id: 'empresarial',
          name: 'Empresarial',
          price: 297.9,
          featured: true,
          features: ['OS ilimitadas'],
          ai_token_limit: 0,
        },
      ],
      enabled_methods: [],
    });
  });

  it('mostra a cota real de tokens de cada plano', async () => {
    render(<StepPlanChoice token="tok" onChoose={async () => {}} onBack={() => {}} />);

    await waitFor(() =>
      expect(screen.getByText('1.250.000 tokens de IA/mês')).toBeInTheDocument(),
    );
    expect(screen.getByText('Tokens de IA ilimitados')).toBeInTheDocument();
  });

  it('nao repete o texto de features sobre tokens (evita numero contraditorio)', async () => {
    render(<StepPlanChoice token="tok" onChoose={async () => {}} onBack={() => {}} />);

    await waitFor(() =>
      expect(screen.getByText('1.250.000 tokens de IA/mês')).toBeInTheDocument(),
    );
    expect(screen.queryByText('1.500.000 tokens de IA')).not.toBeInTheDocument();
    expect(screen.getByText('Até 3 usuários')).toBeInTheDocument();
  });

  it('mantem as caracteristicas em 2 colunas (economiza altura)', async () => {
    render(<StepPlanChoice token="tok" onChoose={async () => {}} onBack={() => {}} />);

    await waitFor(() => expect(screen.getByText('Até 3 usuários')).toBeInTheDocument());
    const list = screen.getByText('Até 3 usuários').closest('ul');
    expect(list).not.toBeNull();
    expect((list as HTMLElement).style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
  });
});

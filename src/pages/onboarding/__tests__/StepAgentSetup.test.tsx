import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { StepAgentSetup } from '../StepAgentSetup';

const mockRepo = vi.hoisted(() => ({ setAgent: vi.fn() }));

vi.mock('../onboarding.repository', () => ({
  OnboardingRepository: class {
    setAgent = mockRepo.setAgent;
  },
}));

/**
 * Issue #95: etapa "Configure seu agente de IA" do wizard publico.
 * As escolhas precisam chegar na edge (set_agent) — nao podem ser decorativas.
 */
describe('StepAgentSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.setAgent.mockResolvedValue({ ok: true });
  });

  it('renderiza nome, estilos de apresentacao e as 3 automacoes', () => {
    render(<StepAgentSetup token="tok" onDone={() => {}} onBack={() => {}} />);

    expect(screen.getByLabelText('Nome do agente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Amig/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Formal/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Técnica/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Próxima/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /bom dia, boa tarde ou boa noite/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Agendar appointments/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Gerar orçamentos e OS/ })).toBeInTheDocument();
  });

  it('envia as escolhas do lead para a edge e segue para o pagamento', async () => {
    const onDone = vi.fn();
    render(<StepAgentSetup token="tok-1" onDone={onDone} onBack={() => {}} />);

    fireEvent.change(screen.getByLabelText('Nome do agente'), { target: { value: 'Dona Ana' } });
    fireEvent.click(screen.getByRole('button', { name: /Formal/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Gerar orçamentos e OS/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar e continuar' }));

    await waitFor(() =>
      expect(mockRepo.setAgent).toHaveBeenCalledWith('tok-1', {
        agent_name: 'Dona Ana',
        agent_presentation: 'formal',
        agent_greeting: true,
        agent_auto_schedule: true,
        agent_auto_os: false,
      }),
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('usa a config salva quando o wizard e retomado', () => {
    render(
      <StepAgentSetup
        token="tok"
        initial={{
          agent_name: 'Bia',
          agent_presentation: 'tecnico',
          agent_greeting: false,
          agent_auto_schedule: false,
          agent_auto_os: true,
        }}
        onDone={() => {}}
        onBack={() => {}}
      />,
    );

    expect(screen.getByLabelText('Nome do agente')).toHaveValue('Bia');
    expect(screen.getByRole('button', { name: /Técnica/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('checkbox', { name: /bom dia, boa tarde ou boa noite/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Agendar appointments/ })).not.toBeChecked();
  });

  it('mostra erro e nao avanca quando a edge falha', async () => {
    mockRepo.setAgent.mockRejectedValue(new Error('offline'));
    const onDone = vi.fn();
    render(<StepAgentSetup token="tok" onDone={onDone} onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar e continuar' }));

    await waitFor(() =>
      expect(screen.getByText('Não foi possível salvar agora. Tente novamente.')).toBeInTheDocument(),
    );
    expect(onDone).not.toHaveBeenCalled();
  });
});

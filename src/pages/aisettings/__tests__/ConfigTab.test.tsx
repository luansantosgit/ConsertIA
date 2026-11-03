import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigTab } from '../ConfigTab';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

/**
 * Issue #97: o admin precisa trocar a persona (tom de apresentação) do
 * agente pelo painel — o mesmo valor usado no wizard público.
 */
describe('ConfigTab — persona do agente', () => {
  const baseProps = {
    agentName: 'Ana',
    agentDesc: 'Contexto extra',
    saving: false,
    saved: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra as 4 opcoes de estilo com a atual marcada', () => {
    render(
      <ConfigTab
        {...baseProps}
        presentationStyle="formal"
        onSave={() => {}}
      />,
    );

    expect(screen.getByRole('radio', { name: /Amigável/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Formal/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Técnica/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Próxima/ })).not.toBeChecked();
  });

  it('salva o estilo escolhido junto com o nome do agente', () => {
    const onSave = vi.fn();
    render(
      <ConfigTab
        {...baseProps}
        presentationStyle="amigavel"
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Técnica/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar identidade' }));

    expect(onSave).toHaveBeenCalledWith('Ana', 'Contexto extra', 'tecnico');
  });

  it('explica que o roteiro de atendimento nao muda', () => {
    render(
      <ConfigTab
        {...baseProps}
        presentationStyle="amigavel"
        onSave={() => {}}
      />,
    );

    expect(
      screen.getByText(/O roteiro de atendimento \(triagem, orçamento, agenda e transferência\) continua o mesmo\./),
    ).toBeInTheDocument();
  });
});

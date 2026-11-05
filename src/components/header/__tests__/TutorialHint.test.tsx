import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

const mockHasContent = vi.fn();

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/useTrainingContent', () => ({
  useTrainingContent: () => ({ hasContent: mockHasContent(), loading: false }),
}));

import { TutorialHint } from '@/components/header/TutorialHint';

const SEEN_KEY = 'deeperia:training-seen';
const HINT_TEXT = 'Tem alguma dúvida? Acesse o tutorial';

/** Harness que navega entre rotas mantendo o atalho montado. */
function HintHarness() {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate('/clientes')}>ir</button>
      <TutorialHint />
    </>
  );
}

function renderHint() {
  return render(
    <MemoryRouter initialEntries={['/atendimento']}>
      <Routes>
        <Route path="/atendimento" element={<HintHarness />} />
        <Route path="/clientes" element={<HintHarness />} />
        <Route path="/treinamento" element={<div>Portal do tutorial</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  mockHasContent.mockReset();
  mockHasContent.mockReturnValue(true);
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Atalho do tutorial no header', () => {
  it('mostra o ícone quando há conteúdo publicado', () => {
    renderHint();
    expect(screen.getByLabelText('Treinamento')).toBeInTheDocument();
  });

  it('não mostra o ícone quando não há conteúdo publicado', () => {
    mockHasContent.mockReturnValue(false);
    renderHint();
    expect(screen.queryByLabelText('Treinamento')).toBeNull();
  });

  it('mostra o balão após 5s parado na mesma página', async () => {
    renderHint();
    expect(screen.queryByText(HINT_TEXT)).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText(HINT_TEXT)).toBeInTheDocument();
  });

  it('reinicia a contagem quando o usuário troca de página', async () => {
    renderHint();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    fireEvent.click(screen.getByText('ir'));

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText(HINT_TEXT)).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText(HINT_TEXT)).toBeInTheDocument();
  });

  it('não mostra o balão para quem já acessou o tutorial', async () => {
    localStorage.setItem(SEEN_KEY, '1');
    renderHint();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText(HINT_TEXT)).toBeNull();
    expect(screen.getByLabelText('Treinamento')).toBeInTheDocument();
  });

  it('abre o tutorial e marca como acessado (não volta a mostrar)', async () => {
    renderHint();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText(HINT_TEXT)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Treinamento'));

    expect(screen.getByText('Portal do tutorial')).toBeInTheDocument();
    expect(localStorage.getItem(SEEN_KEY)).toBe('1');
  });
});

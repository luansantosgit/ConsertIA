import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AboutModal } from '@/components/AboutModal';
import { APP_VERSION, APP_VERSION_LABEL } from '@/lib/version';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ user: { name: 'Luan', tenantName: 'LS Soluções' } }),
}));

const renderModal = (onClose = () => {}, withRoute = false) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      {withRoute ? (
        <Routes>
          <Route path="/" element={<AboutModal open onClose={onClose} />} />
          <Route path="/treinamento" element={<div>Página de treinamento</div>} />
        </Routes>
      ) : (
        <AboutModal open onClose={onClose} />
      )}
    </MemoryRouter>
  );

describe('version', () => {
  it('exposes the app version with a v prefix', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(APP_VERSION_LABEL).toBe(`v${APP_VERSION}`);
  });
});

describe('AboutModal', () => {
  it('shows the current version and app identity', () => {
    renderModal();

    expect(screen.getByText('DeeperIA')).toBeInTheDocument();
    expect(screen.getAllByText(APP_VERSION_LABEL).length).toBeGreaterThanOrEqual(1);
  });

  it('closes on Escape and on backdrop click', () => {
    const onClose = vi.fn();
    const { container } = renderModal(onClose);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(container.querySelector('.modal-overlay')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <MemoryRouter>
        <AboutModal open={false} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('exposes the own-password action and expands the form on demand', () => {
    renderModal();

    const toggle = screen.getByRole('button', { name: /Alterar senha/i });
    expect(toggle).toBeInTheDocument();

    // Formulario de troca de senha aparece ao clicar
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar nova senha')).toBeInTheDocument();
  });

  it('leva ao portal de treinamento pelo chip do usuario', () => {
    const onClose = vi.fn();
    renderModal(onClose, true);

    fireEvent.click(screen.getByLabelText('Treinamento'));
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByText('Página de treinamento')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ user: { name: 'Luan', tenantName: 'LS Soluções' }, logout: vi.fn() }),
}));

vi.mock('@/stores/theme.store', () => ({
  useThemeStore: () => ({ activeTheme: { logoText: 'DeeperIA', logoUrl: null, logoType: 'icon' } }),
}));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/stores/subscription.store', () => ({
  useSubscriptionAlert: () => ({ hasOverdue: false, dueSoon: false }),
}));

vi.mock('@/lib/permissions', () => ({
  canAccess: () => true,
}));

describe('Chip do usuário (acesso ao treinamento)', () => {
  it('navega para /treinamento ao clicar no chip com avatar e versão', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Sidebar isOpen={false} onClose={() => {}} collapsed={false} />} />
          <Route path="/treinamento" element={<div>Página de treinamento</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText('Treinamento'));
    expect(screen.getByText('Página de treinamento')).toBeInTheDocument();
  });

  it('não exibe Treinamento no menu de navegação', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar isOpen={false} onClose={() => {}} collapsed={false} />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: 'Treinamento' })).toBeNull();
  });

  it('mostra versão, divisória e ícone de chapéu isolados à direita', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar isOpen={false} onClose={() => {}} collapsed={false} />
      </MemoryRouter>
    );

    const row = screen.getByLabelText('Treinamento').querySelector('.sidebar-version-row')!;
    const [version, divider, icon] = Array.from(row.children);
    expect(version.getAttribute('class')).toContain('sidebar-version');
    expect(divider.getAttribute('class')).toContain('sidebar-user-divider');
    expect(icon.getAttribute('class')).toContain('sidebar-user-icon');
    // a divisoria fica entre a versao e o icone
    expect(row.children[1]).toBe(divider);
    expect(row.children[2]).toBe(icon);
  });
});

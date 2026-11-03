import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

const renderSidebar = () =>
  render(
    <MemoryRouter>
      <Sidebar isOpen={false} onClose={() => {}} collapsed={false} />
    </MemoryRouter>
  );

describe('Chip do usuário (sidebar)', () => {
  it('mostra avatar, nome e versão', () => {
    const { container } = renderSidebar();

    expect(screen.getByText('Luan')).toBeInTheDocument();
    expect(container.querySelector('.sidebar-user-btn')?.textContent).toBe('L');
    expect(container.querySelector('.sidebar-version')).not.toBeNull();
  });

  it('não é mais o atalho do tutorial (o ícone foi para o header)', () => {
    const { container } = renderSidebar();

    expect(container.querySelector('.sidebar-user-link')).toBeNull();
    expect(container.querySelector('.sidebar-user-icon')).toBeNull();
    expect(container.querySelector('.sidebar-user-divider')).toBeNull();
    expect(screen.queryByLabelText('Treinamento')).toBeNull();
  });

  it('não exibe Treinamento no menu de navegação', () => {
    renderSidebar();

    expect(screen.queryByRole('link', { name: 'Treinamento' })).toBeNull();
  });
});

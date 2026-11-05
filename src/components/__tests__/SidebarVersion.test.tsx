import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { APP_VERSION_LABEL } from '@/lib/version';

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ user: { name: 'Jovani Silva', tenantName: 'LS Soluções' }, logout: vi.fn() }),
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

const renderSidebar = (collapsed: boolean) =>
  render(
    <MemoryRouter>
      <Sidebar isOpen={false} onClose={() => {}} collapsed={collapsed} />
    </MemoryRouter>
  );

describe('Sidebar version', () => {
  it('shows the user name and version when expanded', () => {
    const { container } = renderSidebar(false);

    expect(screen.getByText('Jovani Silva')).toBeInTheDocument();
    expect(container.querySelector('.sidebar-version')?.textContent).toBe(APP_VERSION_LABEL);
    expect(container.querySelector('.sidebar-version-compact')).toBeNull();
  });

  it('shows the compact version when collapsed', () => {
    const { container } = renderSidebar(true);

    expect(container.querySelector('.sidebar-version-compact')?.textContent).toBe(APP_VERSION_LABEL);
    expect(container.querySelector('.sidebar-user-info')).toBeNull();
  });
});

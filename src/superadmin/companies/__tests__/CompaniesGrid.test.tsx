import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompaniesGrid } from '@/superadmin/companies/CompaniesGrid';
import type { Company } from '@/superadmin/companies/types';

const company: Company = {
  id: 't1',
  name: 'TechAssist Ltda',
  domain: 'techassist.deeperia.com.br',
  plan: 'Profissional',
  users: 3,
  status: 'Ativo',
  revenue: 'R$297.9',
  primaryColor: '#2563eb',
  logoText: 'TechAssist',
  joined: '02/11/2026',
  adminEmail: 'admin@techassist.com.br',
  adminCount: 1,
};

function renderGrid(overrides: Partial<React.ComponentProps<typeof CompaniesGrid>> = {}) {
  const props = {
    companies: [company],
    loading: false,
    search: '',
    onSearchChange: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onCreate: vi.fn(),
    ...overrides,
  };
  render(<CompaniesGrid {...props} />);
  return props;
}

describe('CompaniesGrid', () => {
  it('renders one card per company with plan, users and revenue', () => {
    renderGrid();

    expect(screen.getByText('TechAssist Ltda')).toBeInTheDocument();
    expect(screen.getByText('techassist.deeperia.com.br')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('Profissional')).toBeInTheDocument();
    expect(screen.getByText('3 usuários')).toBeInTheDocument();
    expect(screen.getByText('R$297.9/mês')).toBeInTheDocument();
    expect(screen.getByText(/Admin: admin@techassist.com.br/)).toBeInTheDocument();
  });

  it('uses a responsive grid so cards stay side by side on desktop', () => {
    const { container } = render(
      <CompaniesGrid
        companies={[company]}
        loading={false}
        search=""
        onSearchChange={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCreate={vi.fn()}
      />,
    );

    const grid = container.querySelector('.company-card')?.parentElement;
    expect(grid).toBeTruthy();
    expect((grid as HTMLElement).style.gridTemplateColumns).toContain('auto-fill');
    expect((grid as HTMLElement).style.gridTemplateColumns).toContain('minmax(320px, 1fr)');
  });

  it('shows the loading state while companies are being fetched', () => {
    renderGrid({ loading: true, companies: [] });

    expect(screen.getByText('Carregando empresas...')).toBeInTheDocument();
    expect(screen.queryByText('TechAssist Ltda')).not.toBeInTheDocument();
  });

  it('shows an empty state with a create action when there is no company', () => {
    const props = renderGrid({ companies: [] });

    expect(screen.getByText('Nenhuma empresa encontrada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nova Empresa' }));
    expect(props.onCreate).toHaveBeenCalledTimes(1);
  });

  it('forwards the search term', () => {
    const props = renderGrid();

    fireEvent.change(screen.getByPlaceholderText('Buscar empresa, domínio, email...'), {
      target: { value: 'itech' },
    });
    expect(props.onSearchChange).toHaveBeenCalledWith('itech');
  });

  it('triggers edit and delete from the card actions', () => {
    const props = renderGrid();

    fireEvent.click(screen.getByRole('button', { name: /Editar/ }));
    expect(props.onEdit).toHaveBeenCalledWith(company);

    fireEvent.click(screen.getByRole('button', { name: 'Remover empresa' }));
    expect(props.onDelete).toHaveBeenCalledWith('t1');
  });
});

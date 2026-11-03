import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockUpdateName = vi.fn();
const mockRefreshUser = vi.fn();

vi.mock('@/repositories/user.repository', () => ({
  updateMyProfileName: (...args: unknown[]) => mockUpdateName(...args),
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    user: {
      id: 'u1', name: 'Luan', email: 'luan@teste.com', role: 'attendant',
      tenantId: 't1', tenantName: 'TechAssist Ltda',
    },
    refreshUser: mockRefreshUser,
  }),
}));

vi.mock('@/components/ChangePasswordForm', () => ({
  ChangePasswordForm: () => <div>Formulario de senha</div>,
}));

beforeEach(() => {
  mockUpdateName.mockReset();
  mockRefreshUser.mockReset();
});

async function importProfile() {
  const mod = await import('@/pages/Profile');
  return mod.Profile;
}

describe('Profile page', () => {
  it('mostra os dados do usuário e a senha de acesso', async () => {
    const Profile = await importProfile();
    render(<MemoryRouter><Profile /></MemoryRouter>);

    expect(screen.getByText('Perfil')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Luan');
    expect(screen.getByLabelText('E-mail')).toHaveValue('luan@teste.com');
    expect(screen.getByText('Formulario de senha')).toBeInTheDocument();
  });

  it('salva o novo nome e atualiza a sessão', async () => {
    mockUpdateName.mockResolvedValue(undefined);
    const Profile = await importProfile();
    render(<MemoryRouter><Profile /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Luan Silva' } });
    fireEvent.click(screen.getByText('Salvar perfil'));

    await waitFor(() => {
      expect(mockUpdateName).toHaveBeenCalledWith('Luan Silva');
    });
    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalled();
    });
    expect(await screen.findByText('Perfil atualizado ✓')).toBeInTheDocument();
  });

  it('mostra erro quando o salvamento falha', async () => {
    mockUpdateName.mockRejectedValue(new Error('perfil_nao_encontrado'));
    const Profile = await importProfile();
    render(<MemoryRouter><Profile /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Outro' } });
    fireEvent.click(screen.getByText('Salvar perfil'));

    expect(await screen.findByText('perfil_nao_encontrado')).toBeInTheDocument();
  });

  it('volta para o atendimento pelo botão de voltar', async () => {
    const Profile = await importProfile();
    render(
      <MemoryRouter initialEntries={['/perfil']}>
        <Routes>
          <Route path="/perfil" element={<Profile />} />
          <Route path="/atendimento" element={<div>Tela de atendimento</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText('Voltar'));
    expect(screen.getByText('Tela de atendimento')).toBeInTheDocument();
  });
});

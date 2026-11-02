import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PushSetupRow } from '@/components/PushSetupRow';

const mockPush = vi.hoisted(() => ({
  subscribePush: vi.fn(),
  disablePush: vi.fn(),
  isPushAvailable: vi.fn(() => true),
  isPushActive: vi.fn(),
  isPushEnabledByUser: vi.fn(() => false),
  getPushPermissionState: vi.fn(() => 'granted' as 'default' | 'granted' | 'denied'),
}));

vi.mock('@/lib/push', () => mockPush);
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const switchEl = () => screen.getByRole('switch', { name: 'Notificacoes' });

describe('PushSetupRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.isPushAvailable.mockReturnValue(true);
    mockPush.getPushPermissionState.mockReturnValue('granted');
    mockPush.isPushEnabledByUser.mockReturnValue(false);
  });

  it('nao renderiza fora de PWA mobile', () => {
    mockPush.isPushAvailable.mockReturnValue(false);
    const { container } = render(<PushSetupRow />);
    expect(container.firstChild).toBeNull();
  });

  it('reflete o estado real: permissao + subscription ativa', async () => {
    mockPush.isPushActive.mockResolvedValue(true);
    render(<PushSetupRow />);

    await waitFor(() => expect(switchEl()).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByText('Ativas neste dispositivo')).toBeInTheDocument();
  });

  it('nao mascara: flag ligada mas sem permissao real deixa o toggle desligado', async () => {
    mockPush.isPushActive.mockResolvedValue(false);
    mockPush.isPushEnabledByUser.mockReturnValue(true);
    mockPush.getPushPermissionState.mockReturnValue('denied');
    render(<PushSetupRow />);

    await waitFor(() => expect(switchEl()).toHaveAttribute('aria-checked', 'false'));
    expect(screen.getByText('Desativadas neste dispositivo')).toBeInTheDocument();
    expect(
      screen.getByText('Permissao negada — libere as notificacoes nas configuracoes do navegador.'),
    ).toBeInTheDocument();
  });

  it('nao ativa quando o navegador nega a permissao', async () => {
    mockPush.isPushActive.mockResolvedValue(false);
    mockPush.subscribePush.mockResolvedValue({
      ok: false,
      subscribed: false,
      error: 'Permissao negada pelo usuario',
    });
    render(<PushSetupRow />);

    await waitFor(() => expect(switchEl()).toHaveAttribute('aria-checked', 'false'));
    fireEvent.click(switchEl());

    await waitFor(() =>
      expect(
        screen.getByText('Permissao negada — libere as notificacoes nas configuracoes do navegador.'),
      ).toBeInTheDocument(),
    );
    expect(switchEl()).toHaveAttribute('aria-checked', 'false');
  });

  it('liga o toggle quando a subscription passa a existir', async () => {
    mockPush.isPushActive.mockResolvedValue(false);
    mockPush.subscribePush.mockResolvedValue({ ok: true, subscribed: true });
    render(<PushSetupRow />);

    await waitFor(() => expect(switchEl()).toHaveAttribute('aria-checked', 'false'));
    mockPush.isPushActive.mockResolvedValue(true);
    fireEvent.click(switchEl());

    await waitFor(() => expect(switchEl()).toHaveAttribute('aria-checked', 'true'));
    expect(mockPush.subscribePush).toHaveBeenCalledTimes(1);
  });

  it('desliga o toggle e chama disablePush', async () => {
    mockPush.isPushActive.mockResolvedValue(true);
    mockPush.disablePush.mockResolvedValue({ ok: true });
    render(<PushSetupRow />);

    await waitFor(() => expect(switchEl()).toHaveAttribute('aria-checked', 'true'));
    fireEvent.click(switchEl());

    await waitFor(() => expect(switchEl()).toHaveAttribute('aria-checked', 'false'));
    expect(mockPush.disablePush).toHaveBeenCalledTimes(1);
  });
});

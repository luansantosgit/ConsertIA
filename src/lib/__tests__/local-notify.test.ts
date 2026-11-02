import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifyIncomingMessage } from '@/lib/local-notify';

/**
 * Issue #92: banner local quando o painel recebe mensagem com o app
 * nao visivel (tela bloqueada / PWA em background). O realtime entrega,
 * a notificacao local mostra — com dedupe contra o push do servidor.
 */

const mockPush = vi.hoisted(() => ({
  isPushAvailable: vi.fn(() => true),
  getPushPermissionState: vi.fn(() => 'granted' as 'default' | 'granted' | 'denied'),
}));
const mockReceipts = vi.hoisted(() => ({
  hasRecentReceipt: vi.fn(async () => false),
  stampReceipt: vi.fn(async () => {}),
}));

vi.mock('@/lib/push', () => mockPush);
vi.mock('@/lib/push-receipts', () => mockReceipts);

const showNotification = vi.fn(async () => {});
const nav = navigator as unknown as { serviceWorker?: unknown };

const setServiceWorker = (registration: unknown) => {
  Object.defineProperty(nav, 'serviceWorker', {
    configurable: true,
    value: registration
      ? { getRegistration: vi.fn(async () => registration) }
      : undefined,
  });
};

const notice = { conversationId: 'conv-1', title: 'Maria Silva', body: 'Cliente: atencao 1...' };

describe('notifyIncomingMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.isPushAvailable.mockReturnValue(true);
    mockPush.getPushPermissionState.mockReturnValue('granted');
    mockReceipts.hasRecentReceipt.mockResolvedValue(false);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    setServiceWorker({ showNotification });
    showNotification.mockClear();
  });

  it('mostra o banner quando o app esta oculto e tudo permitido', async () => {
    await notifyIncomingMessage(notice);

    expect(showNotification).toHaveBeenCalledWith('Maria Silva', expect.objectContaining({
      body: 'Cliente: atencao 1...',
      tag: 'conv-1',
    }));
    expect(mockReceipts.stampReceipt).toHaveBeenCalledWith('conv-1', 'local');
  });

  it('nao notifica quando o usuario esta olhando o app', async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });

    await notifyIncomingMessage(notice);

    expect(showNotification).not.toHaveBeenCalled();
    expect(mockReceipts.stampReceipt).not.toHaveBeenCalled();
  });

  it('nao notifica fora de PWA mobile (regra de produto)', async () => {
    mockPush.isPushAvailable.mockReturnValue(false);

    await notifyIncomingMessage(notice);

    expect(showNotification).not.toHaveBeenCalled();
  });

  it('nao notifica sem permissao concedida', async () => {
    mockPush.getPushPermissionState.mockReturnValue('denied');

    await notifyIncomingMessage(notice);

    expect(showNotification).not.toHaveBeenCalled();
  });

  it('dedupe: pula quando o push do servidor ja avisou a conversa', async () => {
    mockReceipts.hasRecentReceipt.mockResolvedValue(true);

    await notifyIncomingMessage(notice);

    expect(showNotification).not.toHaveBeenCalled();
    expect(mockReceipts.stampReceipt).not.toHaveBeenCalled();
  });

  it('falha silenciosa quando service worker nao existe', async () => {
    setServiceWorker(null);

    await expect(notifyIncomingMessage(notice)).resolves.toBeUndefined();
    expect(showNotification).not.toHaveBeenCalled();
  });
});

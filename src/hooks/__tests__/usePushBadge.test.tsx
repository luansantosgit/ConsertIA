import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePushBadge } from '@/hooks/usePushBadge';

/**
 * Issue #93: o badge precisa reagir ao realtime (e a "voltar pra
 * frente" do app) e GRAVAR o unread real no contador IDB — e esse
 * valor que o service worker incrementa nos pushes com o app fechado.
 */

const mockPush = vi.hoisted(() => ({
  setAppBadge: vi.fn(),
  isPushAvailable: vi.fn(() => true),
}));
const mockBadgeCounter = vi.hoisted(() => ({
  setBadgeCount: vi.fn(async () => {}),
  UNREAD_CHANGED_EVENT: 'deeperia:unread-changed',
}));
const mockGetUnreadCount = vi.hoisted(() => vi.fn(async () => 3));

vi.mock('@/lib/push', () => mockPush);
vi.mock('@/lib/badge-counter', () => mockBadgeCounter);
vi.mock('@/repositories/conversation.repository', () => ({
  ConversationRepository: class {
    getUnreadCount = mockGetUnreadCount;
  },
}));

describe('usePushBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.isPushAvailable.mockReturnValue(true);
    mockGetUnreadCount.mockResolvedValue(3);
  });

  it('calcula o unread, seta o badge e grava o contador no mount', async () => {
    renderHook(() => usePushBadge());

    await waitFor(() => expect(mockPush.setAppBadge).toHaveBeenCalledWith(3));
    await waitFor(() => expect(mockBadgeCounter.setBadgeCount).toHaveBeenCalledWith(3));
  });

  it('nao faz nada fora de PWA mobile', async () => {
    mockPush.isPushAvailable.mockReturnValue(false);
    renderHook(() => usePushBadge());

    await waitFor(() => expect(mockGetUnreadCount).not.toHaveBeenCalled());
    expect(mockPush.setAppBadge).not.toHaveBeenCalled();
    expect(mockBadgeCounter.setBadgeCount).not.toHaveBeenCalled();
  });

  it('reassenta o badge quando o realtime avisa unread mudado', async () => {
    renderHook(() => usePushBadge());
    await waitFor(() => expect(mockBadgeCounter.setBadgeCount).toHaveBeenCalledWith(3));

    mockGetUnreadCount.mockResolvedValue(5);
    act(() => {
      window.dispatchEvent(new CustomEvent(mockBadgeCounter.UNREAD_CHANGED_EVENT));
    });

    await waitFor(() => expect(mockBadgeCounter.setBadgeCount).toHaveBeenCalledWith(5));
    await waitFor(() => expect(mockPush.setAppBadge).toHaveBeenLastCalledWith(5));
  });

  it('reassenta o badge quando o app volta pra frente', async () => {
    renderHook(() => usePushBadge());
    await waitFor(() => expect(mockBadgeCounter.setBadgeCount).toHaveBeenCalledWith(3));

    mockGetUnreadCount.mockResolvedValue(2);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(mockBadgeCounter.setBadgeCount).toHaveBeenCalledWith(2));
  });
});

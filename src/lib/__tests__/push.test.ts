import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getPushPermissionState,
  isPushSupported,
  setAppBadge,
  requestPushPermission,
} from '@/lib/push';

/** Tipos amigaveis para test: jsdom nao tem PushManager/Badging API. */
type TestWindow = { PushManager?: unknown };
type TestNavigator = Omit<Navigator, 'serviceWorker' | 'setAppBadge' | 'clearAppBadge'> & {
  serviceWorker?: unknown;
  setAppBadge?: (n?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};
type NotificationGlobal = {
  permission?: string;
  requestPermission?: () => Promise<string>;
};
const win = window as unknown as TestWindow;
const nav = navigator as unknown as TestNavigator;
const notificationHost = globalThis as unknown as {
  Notification?: NotificationGlobal | undefined;
};
const originalNotification = notificationHost.Notification;

describe('isPushSupported', () => {
  const originalPush = win.PushManager;
  const originalSw = nav.serviceWorker;

  afterEach(() => {
    win.PushManager = originalPush;
    nav.serviceWorker = originalSw;
  });

  it('retorna false sem service worker/PushManager (jsdom)', () => {
    delete win.PushManager;
    delete nav.serviceWorker;
    expect(isPushSupported()).toBe(false);
  });

  it('retorna true quando service worker e PushManager existem', () => {
    win.PushManager = class {};
    nav.serviceWorker = {};
    expect(isPushSupported()).toBe(true);
  });
});

describe('getPushPermissionState', () => {
  afterEach(() => {
    notificationHost.Notification = originalNotification;
  });

  it('mapeia Notification.permission', () => {
    notificationHost.Notification = { permission: 'granted' };
    expect(getPushPermissionState()).toBe('granted');
  });

  it('retorna default quando Notification nao existe', () => {
    notificationHost.Notification = undefined;
    expect(getPushPermissionState()).toBe('default');
  });
});

describe('requestPushPermission', () => {
  afterEach(() => {
    notificationHost.Notification = originalNotification;
  });

  it('retorna o resultado de Notification.requestPermission', async () => {
    notificationHost.Notification = {
      requestPermission: () => Promise.resolve('granted'),
    };
    const result = await requestPushPermission();
    expect(result).toBe('granted');
  });
});

describe('setAppBadge', () => {
  const originalSet = nav.setAppBadge;
  const originalClear = nav.clearAppBadge;

  beforeEach(() => {
    nav.setAppBadge = vi.fn().mockResolvedValue(undefined);
    nav.clearAppBadge = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    nav.setAppBadge = originalSet;
    nav.clearAppBadge = originalClear;
  });

  it('chama setAppBadge com count > 0', () => {
    setAppBadge(3);
    expect(nav.setAppBadge).toHaveBeenCalledWith(3);
  });

  it('chama clearAppBadge quando count = 0', () => {
    setAppBadge(0);
    expect(nav.clearAppBadge).toHaveBeenCalled();
  });

  it('nao quebra quando Badging API nao existe', () => {
    delete nav.setAppBadge;
    delete nav.clearAppBadge;
    expect(() => setAppBadge(2)).not.toThrow();
  });
});

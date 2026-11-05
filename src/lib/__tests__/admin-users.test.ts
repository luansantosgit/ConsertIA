// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncAdminMetadata } from '../../../supabase/functions/_shared/admin-users.ts';

/**
 * Regressao do Issue #91: ao finalizar o wizard reutilizando um auth
 * user, os user_metadata (tenant_id/role) precisam apontar para o
 * tenant finalizado — as policies RLS usam esse claim. Usuario de
 * wizard abandonado tinha metadata de um tenant destruido e o login
 * falhava com "Perfil de usuario nao encontrado no sistema".
 */

function makeAdmin() {
  return {
    auth: {
      admin: {
        getUserById: vi.fn(),
        updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
  };
}

describe('syncAdminMetadata', () => {
  let admin: ReturnType<typeof makeAdmin>;
  const TENANT = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    admin = makeAdmin();
  });

  it('realinha tenant_id e role quando apontam para outro tenant', async () => {
    admin.auth.admin.getUserById.mockResolvedValue({
      data: { user: { user_metadata: { tenant_id: 'antigo', role: 'admin', name: 'Maria' } } },
    });

    await syncAdminMetadata(admin, 'uid', TENANT, 'Nome Fallback');

    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith('uid', {
      user_metadata: expect.objectContaining({ tenant_id: TENANT, role: 'admin' }),
    });
  });

  it('nao demove um superadmin reutilizado', async () => {
    admin.auth.admin.getUserById.mockResolvedValue({
      data: { user: { user_metadata: { tenant_id: 'antigo', role: 'superadmin' } } },
    });

    await syncAdminMetadata(admin, 'uid', TENANT, 'Fallback');

    expect(admin.auth.admin.updateUserById).not.toHaveBeenCalled();
  });

  it('pula quando a metadata ja aponta para o tenant correto', async () => {
    admin.auth.admin.getUserById.mockResolvedValue({
      data: { user: { user_metadata: { tenant_id: TENANT, role: 'admin' } } },
    });

    await syncAdminMetadata(admin, 'uid', TENANT, 'Fallback');

    expect(admin.auth.admin.updateUserById).not.toHaveBeenCalled();
  });

  it('propaga erro do Auth Admin API', async () => {
    admin.auth.admin.getUserById.mockResolvedValue({
      data: { user: { user_metadata: { tenant_id: 'antigo' } } },
    });
    admin.auth.admin.updateUserById.mockResolvedValue({
      data: {},
      error: { message: 'boom' },
    });

    await expect(syncAdminMetadata(admin, 'uid', TENANT, 'Fallback')).rejects.toThrow(
      'metadata_sync_failed: boom',
    );
  });
});

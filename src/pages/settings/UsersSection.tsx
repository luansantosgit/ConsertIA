import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { SkeletonCard } from '@/components/Skeleton';
import ErrorMessage from '@/components/ErrorMessage';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useAuthStore } from '@/stores/auth.store';
import { TenantUserRepository, type TenantUser, type PlanUsage } from '@/repositories/tenant-user.repository';
import { useTranslation } from '@/hooks/useTranslation';
import { UserFormModal } from './UserFormModal';
import { UserRow } from './UserRow';

const repo = new TenantUserRepository();

export const UsersSection: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [usage, setUsage] = useState<PlanUsage>({ count: 0, maxUsers: 0, planName: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TenantUser | null>(null);
  const [confirm, setConfirm] = useState<{
    isOpen: boolean; title: string; message: string;
    variant: 'danger' | 'warning' | 'info'; onConfirm: () => void | Promise<void>;
  }>({ isOpen: false, title: '', message: '', variant: 'danger', onConfirm: () => {} });

  const load = useCallback(async () => {
    const tenantId = useAuthStore.getState().user?.tenantId;
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [list, planUsage] = await Promise.all([
        repo.getAll(tenantId),
        repo.getPlanUsage(tenantId),
      ]);
      setUsers(list);
      setUsage(planUsage);
    } catch {
      setError('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const limitReached = usage.maxUsers > 0 && usage.count >= usage.maxUsers;

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (u: TenantUser) => { setEditing(u); setModalOpen(true); };

  const handleToggleActive = (u: TenantUser) => {
    const activating = !u.active;
    setConfirm({
      isOpen: true,
      variant: 'warning',
      title: activating ? 'Reativar usuário' : 'Desativar usuário',
      message: activating
        ? `Reativar "${u.name}"? Ele voltará a acessar o sistema com as permissões configuradas.`
        : `Desativar "${u.name}"? Ele não conseguirá mais acessar o sistema. Nenhum dado será perdido.`,
      onConfirm: async () => {
        try {
          await repo.update(u.id, { active: activating });
          await load();
        } catch {
          setError('Erro ao atualizar usuário');
        } finally {
          setConfirm(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDelete = (u: TenantUser) => {
    setConfirm({
      isOpen: true,
      variant: 'danger',
      title: 'Excluir usuário',
      message: `Excluir "${u.name}" permanentemente? O usuário perderá o acesso e o histórico de login será removido. Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          await repo.remove(u.id);
          await load();
        } catch {
          setError('Erro ao excluir usuário');
        } finally {
          setConfirm(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  if (loading) return <SkeletonCard />;

  if (error) {
    return <ErrorMessage message={error} onRetry={load} />;
  }

  return (
    <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{t('Usuários')}</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Cadastre sua equipe e defina quais recursos cada usuário pode ver e usar.
          </p>
          <span className="badge badge-gray" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Users size={12} />
            {usage.maxUsers > 0
              ? `${usage.count} de ${usage.maxUsers} usuários · Plano ${usage.planName}`
              : `${usage.count} usuários · Plano ${usage.planName}`}
          </span>
        </div>
        <button
          className="btn btn-primary"
          onClick={openCreate}
          disabled={limitReached}
          title={limitReached ? `Limite do plano atingido (${usage.maxUsers} usuários)` : undefined}
        >
          <UserPlus size={15} /> Adicionar
        </button>
      </div>

      {users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Users size={24} /></div>
          <p className="empty-state-title">Nenhum usuário</p>
          <p className="empty-state-desc">Adicione sua equipe para distribuir o atendimento.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {users.map(u => (
            <UserRow
              key={u.id}
              u={u}
              isSelf={u.id === user?.id}
              onEdit={openEdit}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <UserFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />

      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={() => setConfirm(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirm.onConfirm}
        title={confirm.title}
        message={confirm.message}
        variant={confirm.variant}
      />
    </div>
  );
};

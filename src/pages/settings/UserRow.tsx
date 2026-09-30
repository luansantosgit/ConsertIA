import React from 'react';
import { Pencil, Trash2, Power } from 'lucide-react';
import type { TenantUser } from '@/repositories/tenant-user.repository';
import { ASSIGNABLE_MODULES } from '@/lib/permissions';
import { useTranslation } from '@/hooks/useTranslation';

const ROLE_LABELS: Record<string, string> = {  admin: 'Administrador',
  manager: 'Gerente',
  technician: 'Técnico',
  attendant: 'Atendente',
  superadmin: 'Super Admin',
};

const ROLE_BADGE: Record<string, string> = {
  admin: 'badge badge-primary',
  manager: 'badge badge-info',
  superadmin: 'badge badge-warning',
};

function permsSummary(u: TenantUser): string {
  if (u.role === 'admin' || u.role === 'superadmin') return 'Acesso completo';
  if (u.permissions.length === 0) return 'Nenhum recurso';
  if (u.permissions.length >= ASSIGNABLE_MODULES.length) return 'Todos os recursos';
  return `${u.permissions.length} de ${ASSIGNABLE_MODULES.length} recursos`;
}

export const UserRow: React.FC<{
  u: TenantUser;
  isSelf: boolean;
  onEdit: (u: TenantUser) => void;
  onToggleActive: (u: TenantUser) => void;
  onDelete: (u: TenantUser) => void;
}> = ({ u, isSelf, onEdit, onToggleActive, onDelete }) => {
  const { t } = useTranslation();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: 'var(--primary-light)', color: 'var(--primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '0.875rem',
      }}>
        {u.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          {u.name}
          {isSelf && <span className="badge badge-gray" style={{ fontSize: '0.625rem' }}>Você</span>}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {u.email} · {permsSummary(u)}
        </p>
      </div>
      <span className={ROLE_BADGE[u.role] ?? 'badge badge-gray'}>{ROLE_LABELS[u.role] ?? u.role}</span>
      <span className={`badge ${u.active ? 'badge-success' : 'badge-gray'}`}>
        {u.active ? t('Ativo') : t('Inativo')}
      </span>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(u)} title={t('Editar')}>
          <Pencil size={14} />
        </button>
        {!isSelf && (
          <>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onToggleActive(u)}
              title={u.active ? 'Desativar' : 'Reativar'}
              style={{ color: u.active ? 'var(--text-muted)' : 'var(--success-text, #16a34a)' }}
            >
              <Power size={14} />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onDelete(u)}
              title={t('Excluir')}
              style={{ color: 'var(--danger)' }}
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

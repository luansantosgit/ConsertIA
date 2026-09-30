import React, { useEffect, useState } from 'react';
import { Shield, X } from 'lucide-react';
import { ASSIGNABLE_MODULES, type ModuleKey } from '@/lib/permissions';
import { TenantUserRepository, type TenantUser } from '@/repositories/tenant-user.repository';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from '@/hooks/useTranslation';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gerente' },
  { value: 'technician', label: 'Técnico' },
  { value: 'attendant', label: 'Atendente' },
];

function errorToMessage(err: Error & { code?: string; maxUsers?: number }): string {
  switch (err.code) {
    case 'limit_reached':
      return `Limite de usuários do plano atingido (${err.maxUsers ?? 0}). Faça upgrade para adicionar mais.`;
    case 'email_exists':
      return 'Este e-mail já está cadastrado.';
    case 'weak_password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'invalid_data':
      return 'Preencha nome e um e-mail válido.';
    default:
      return 'Erro ao salvar usuário. Tente novamente.';
  }
}

export const UserFormModal: React.FC<{
  open: boolean;
  editing: TenantUser | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, editing, onClose, onSaved }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('attendant');
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const repo = new TenantUserRepository();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPassword('');
    if (editing) {
      setName(editing.name);
      setEmail(editing.email);
      setRole(editing.role);
      setActive(editing.active);
      setPerms(new Set(editing.permissions));
    } else {
      setName('');
      setEmail('');
      setRole('attendant');
      setActive(true);
      setPerms(new Set(ASSIGNABLE_MODULES.map(m => m.key)));
    }
  }, [open, editing]);

  if (!open) return null;

  const togglePerm = (key: ModuleKey) => {
    setPerms(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || (!editing && password.length < 6)) {
      setError('Preencha nome, e-mail e uma senha com pelo menos 6 caracteres.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await repo.update(editing.id, {
          name: name.trim(),
          role,
          active,
          permissions: Array.from(perms),
        });
      } else {
        await repo.create({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          permissions: Array.from(perms),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(errorToMessage(err as Error & { code?: string; maxUsers?: number }));
    } finally {
      setSaving(false);
    }
  };

  const isAdminRole = role === 'admin';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3 className="modal-title">{editing ? t('Editar') : 'Novo Usuário'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">{t('Nome')}</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Maria Oliveira" />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input
              className="input" type="email" value={email}
              disabled={!!editing}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
            />
          </div>
          {!editing && (
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input
                className="input" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">{t('Perfil')}</label>
            <select className="select" value={role} onChange={e => setRole(e.target.value)}>
              {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={13} /> Recursos do sistema
            </label>
            {isAdminRole ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Administradores têm acesso completo a todos os recursos.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {ASSIGNABLE_MODULES.map(m => (
                  <label
                    key={m.key}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                      padding: '8px 10px', borderRadius: 8,
                      border: `1px solid ${perms.has(m.key) ? 'var(--primary)' : 'var(--border)'}`,
                      background: perms.has(m.key) ? 'var(--primary-light)' : 'transparent',
                      transition: 'background 0.12s, border-color 0.12s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={perms.has(m.key)}
                      onChange={() => togglePerm(m.key)}
                      style={{ width: 14, height: 14, accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{t(m.label)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {editing && editing.id !== user?.id && (
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="form-label" style={{ margin: 0 }}>{t('Status')}</label>
              <button
                className={`btn btn-sm ${active ? 'btn-ghost' : 'btn-secondary'}`}
                onClick={() => setActive(v => !v)}
                disabled={saving}
              >
                {active ? `● ${t('Ativo')}` : `● ${t('Inativo')}`}
              </button>
            </div>
          )}
          {error && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', margin: 0 }}>{error}</p>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('Cancelar')}</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? t('Carregando...') : t('Salvar')}
          </button>
        </div>
      </div>
    </div>
  );
};

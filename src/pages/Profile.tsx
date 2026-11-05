import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth.store';
import { updateMyProfileName } from '@/repositories/user.repository';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  technician: 'Técnico',
  attendant: 'Atendente',
};

/** Perfil do usuário: dados de acesso + troca da senha de login. */
export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const save = async () => {
    if (!name.trim() || name.trim() === user?.name) return;
    setSaving(true);
    setFeedback(null);
    try {
      await updateMyProfileName(name.trim());
      await refreshUser();
      setFeedback({ type: 'ok', text: t('Perfil atualizado ✓') });
    } catch (err) {
      setFeedback({ type: 'error', text: (err as Error)?.message || t('Não foi possível salvar o perfil.') });
    } finally {
      setSaving(false);
    }
  };

  const dirty = name.trim().length > 0 && name.trim() !== user?.name;

  return (
    <div className="page" style={{ gap: 18 }}>
      <div className="page-header" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => navigate('/atendimento')}
            aria-label={t('Voltar')}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="page-title">{t('Perfil')}</h2>
            <p className="page-subtitle">{t('Seus dados e sua senha de acesso')}</p>
          </div>
        </div>
      </div>

      <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserRound size={16} /> {t('Dados do perfil')}
        </h3>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="profile-name">{t('Nome')}</label>
          <input
            id="profile-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('Nome')}
            autoComplete="name"
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="profile-email">{t('E-mail')}</label>
          <input id="profile-email" className="input" value={user?.email ?? ''} readOnly disabled />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {t('O e-mail de acesso é gerenciado pelo administrador da empresa.')}
          </p>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1, margin: 0 }}>
            <label className="form-label">{t('Cargo')}</label>
            <input className="input" value={ROLE_LABEL[user?.role ?? ''] ?? user?.role ?? ''} readOnly disabled />
          </div>
          <div className="form-group" style={{ flex: 1, margin: 0 }}>
            <label className="form-label">{t('Empresa')}</label>
            <input className="input" value={user?.tenantName ?? ''} readOnly disabled />
          </div>
        </div>
        {feedback && (
          <p style={{
            margin: 0, fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6,
            color: feedback.type === 'ok' ? 'var(--success)' : 'var(--danger)',
          }}>
            {feedback.type === 'ok' && <CheckCircle2 size={14} />}
            {feedback.text}
          </p>
        )}
        <div>
          <button className="btn btn-primary" onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 size={15} className="spin" /> : null}
            {saving ? t('Salvando...') : t('Salvar perfil')}
          </button>
        </div>
      </div>

      <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyRound size={16} /> {t('Senha de acesso')}
        </h3>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {t('Use pelo menos 6 caracteres. Depois de salvar, entre com a nova senha.')}
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
};

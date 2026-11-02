import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { TenantUserRepository, type TenantUser } from '@/repositories/tenant-user.repository';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';
import { CredentialsModal } from '@/components/CredentialsModal';
import { ConfirmModal } from '@/components/ConfirmModal';

const repo = new TenantUserRepository();

interface UserPasswordSectionProps {
  /** Usuario em edicao. */
  user: TenantUser;
  /** Indica se o usuario em edicao e o proprio usuario logado. */
  isSelf: boolean;
  /** Chamado quando o admin tenta renovar a senha de terceiro. */
  onError: (message: string) => void;
}

function renewErrorMessage(err: Error & { code?: string }): string {
  switch (err.code) {
    case 'not_found':
      return 'Usuário não encontrado.';
    case 'forbidden':
      return 'Você não tem permissão para alterar este usuário.';
    case 'unauthorized':
      return 'Sessão expirada. Entre novamente para continuar.';
    default:
      return 'Não foi possível renovar a senha. Tente novamente.';
  }
}

/**
 * Bloco de senha do modal de edicao de usuario.
 *
 * - Editando a si mesmo: troca de senha manual (sua propria conta).
 * - Editando outro usuario: apenas "Renovar senha" (senha gerada no
 *   servidor). O admin nunca digita a senha de terceiros.
 */
export const UserPasswordSection: React.FC<UserPasswordSectionProps> = ({
  user,
  isSelf,
  onError,
}) => {
  const { t } = useTranslation();
  const [renewing, setRenewing] = useState(false);
  const [confirmRenew, setConfirmRenew] = useState(false);
  const [renewed, setRenewed] = useState<{ email: string; password: string } | null>(null);

  const handleRenew = async () => {
    if (renewing) return;
    setRenewing(true);
    try {
      const result = await repo.renewPassword(user.id);
      setRenewed(result);
      setConfirmRenew(false);
    } catch (err) {
      onError(renewErrorMessage(err as Error & { code?: string }));
      setConfirmRenew(false);
    } finally {
      setRenewing(false);
    }
  };

  if (isSelf) {
    return (
      <div className="form-group" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <KeyRound size={13} /> {t('Minha senha')}
        </label>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
          Defina uma nova senha para o seu acesso. Use pelo menos 6 caracteres.
        </p>
        <ChangePasswordForm />
      </div>
    );
  }

  return (
    <>
      <div className="form-group" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <KeyRound size={13} /> {t('Senha do usuário')}
        </label>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
          Por segurança a senha do usuário não pode ser digitada aqui. Renove para gerar
          uma senha nova e compartilhe com ele.
        </p>
        <button className="btn btn-secondary" onClick={() => setConfirmRenew(true)} disabled={renewing}>
          <KeyRound size={15} /> {t('Renovar senha')}
        </button>
      </div>

      <ConfirmModal
        isOpen={confirmRenew}
        onClose={() => setConfirmRenew(false)}
        onConfirm={handleRenew}
        loading={renewing}
        title="Renovar senha"
        message={`Gera uma nova senha para "${user.name}". A senha atual deixa de funcionar imediatamente e você precisará compartilhar a nova com ele.`}
        confirmLabel={t('Renovar senha')}
        variant="warning"
      />

      <CredentialsModal
        credentials={renewed}
        config={{
          title: 'Senha renovada! 🔑',
          successMessage: `Nova senha gerada para ${user.name}.`,
          hint: 'Compartilhe os novos dados de acesso com o usuário:',
          passwordLabel: t('Nova senha'),
          footnote: 'Recomendamos que o usuário altere a senha no primeiro acesso.',
        }}
        onClose={() => setRenewed(null)}
      />
    </>
  );
};

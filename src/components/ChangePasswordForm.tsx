import React, { useState } from 'react';
import { CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';

interface ChangePasswordFormProps {
  /** Chamado depois que a senha foi alterada com sucesso. */
  onChanged?: () => void;
  /** Rotulo do botao de confirmacao. */
  submitLabel?: string;
}

const MIN_LENGTH = 6;

/**
 * Formulario de troca da propria senha. Usa supabase.auth.updateUser(),
 * que opera na conta do usuario logado (a senha do admin nao passa pelo
 * formulario de edicao de terceiros).
 */
export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({
  onChanged,
  submitLabel,
}) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    setError(null);
    setSuccess(false);
    if (password.length < MIN_LENGTH) {
      setError(`A senha deve ter pelo menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError('As senhas nao conferem.');
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword('');
      setConfirm('');
      setSuccess(true);
      onChanged?.();
    } catch (err) {
      setError((err as Error)?.message || 'Nao foi possivel alterar a senha.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label" htmlFor="change-password-new">{t('Nova senha')}</label>
        <input
          id="change-password-new"
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={`Minimo de ${MIN_LENGTH} caracteres`}
          autoComplete="new-password"
        />
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label" htmlFor="change-password-confirm">{t('Confirmar nova senha')}</label>
        <input
          id="change-password-confirm"
          className="input"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repita a nova senha"
          autoComplete="new-password"
        />
      </div>
      {error && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', margin: 0 }}>{error}</p>
      )}
      {success && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--success)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle2 size={14} /> Senha alterada com sucesso.
        </p>
      )}
      <button className="btn btn-secondary" onClick={submit} disabled={busy}>
        {busy ? <Loader2 size={15} className="spin" /> : <KeyRound size={15} />}
        {submitLabel ?? t('Alterar senha')}
      </button>
    </div>
  );
};

import React from 'react';
import { Bell, BellDot } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { usePushBadge } from '@/hooks/usePushBadge';

interface PushBadgeButtonProps {
  className?: string;
}

/**
 * Botao de notificacoes com badge visual (numero de nao lidas)
 * e badge do sistema operacional (Badging API) no ícone do app instalado.
 */
export const PushBadgeButton: React.FC<PushBadgeButtonProps> = ({ className }) => {
  const { t } = useTranslation();
  const { count, loading, refresh } = usePushBadge();

  return (
    <button
      type="button"
      className={`btn btn-ghost btn-icon relative ${className ?? ''}`}
      onClick={refresh}
      title={t('Notificacoes')}
      aria-label={`${t('Notificacoes')} — ${count} nao lida${count !== 1 ? 's' : ''}`}
    >
      {loading ? (
        <BellDot size={20} />
      ) : count > 0 ? (
        <BellDot size={20} />
      ) : (
        <Bell size={20} />
      )}
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
          <span
            className="inline-flex items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white px-1"
            style={{ minWidth: '16px', height: '16px' }}
          >
            {count > 9 ? '9+' : count}
          </span>
        </span>
      )}
    </button>
  );
};

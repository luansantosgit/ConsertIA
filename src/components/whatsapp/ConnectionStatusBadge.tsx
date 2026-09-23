import type { ConnectionStatus, ConnectionProvider } from '@/types';

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus;
  provider: ConnectionProvider;
  size?: 'sm' | 'md';
}

export function ConnectionStatusBadge({ status, provider, size = 'md' }: ConnectionStatusBadgeProps) {
  const getStatusConfig = () => {
    if (status === 'connected') {
      return {
        label: provider === 'api_oficial' ? 'API OFICIAL' : 'CONECTADO',
        className: 'badge-success',
        dot: true,
      };
    }

    if (status === 'waiting') {
      return {
        label: 'AGUARDANDO',
        className: 'badge-warning',
        dot: true,
      };
    }

    return {
      label: provider === 'api_oficial' ? 'API OFICIAL (INATIVA)' : 'DESCONECTADO',
      className: 'badge-danger',
      dot: false,
    };
  };

  const config = getStatusConfig();
  const sizeClass = size === 'sm' ? 'badge-sm' : '';

  return (
    <span className={`badge ${config.className} ${sizeClass}`}>
      {config.dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            display: 'inline-block',
            marginRight: 4,
          }}
        />
      )}
      {config.label}
    </span>
  );
}

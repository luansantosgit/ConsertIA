import React from 'react';
import {
  SolidActionChat,
  SolidActionEdit,
  SolidActionTrash,
  SolidActionPhone,
  SolidActionMail,
  SolidActionPin,
} from '@/components/SolidActionIcons';
import { Search } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import type { Customer } from '@/types';
import { SkeletonTable } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';

const AVATAR_COLORS = ['#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#16a34a', '#0891b2'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

interface CustomerTableProps {
  customers: Customer[];
  loading: boolean;
  onStartChat: (c: Customer) => void;
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
  onNewCustomer: () => void;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  loading,
  onStartChat,
  onEdit,
  onDelete,
  onNewCustomer,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return <SkeletonTable />;
  }

  if (customers.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title={t('Nenhum cliente encontrado')}
        actionLabel={t('Novo Cliente')}
        onAction={onNewCustomer}
      />
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <th style={{ width: 56, paddingLeft: 20 }}></th>
          <th>{t('Nome')}</th>
          <th>{t('Email')}</th>
          <th>{t('Telefone')}</th>
          <th>{t('Endereço')}</th>
          <th style={{ textAlign: 'right', paddingRight: 20 }}>{t('Ações')}</th>
        </tr>
      </thead>
      <tbody>
        {customers.map((c, i) => (
          <tr key={c.id}>
            <td style={{ paddingLeft: 20, width: 56 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: AVATAR_COLORS[i % AVATAR_COLORS.length] + '18',
                color: AVATAR_COLORS[i % AVATAR_COLORS.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700,
              }}>
                {getInitials(c.name)}
              </div>
            </td>
            <td>
              <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name}</p>
              {c.cpf_cnpj && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>{c.cpf_cnpj}</p>
              )}
            </td>
            <td>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <SolidActionMail size={14} />
                {c.email || '—'}
              </span>
            </td>
            <td>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <SolidActionPhone size={14} />
                {c.phone || c.mobile || '—'}
              </span>
            </td>
            <td style={{ color: 'var(--text-secondary)', maxWidth: 220 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem' }}>
                <SolidActionPin size={14} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[c.address, c.city, c.state].filter(Boolean).join(', ') || '—'}
                </span>
              </span>
            </td>
            <td style={{ textAlign: 'right', paddingRight: 20 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <button
                  title={t('Iniciar Chat')}
                  onClick={() => onStartChat(c)}
                  className="btn-icon"
                  style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16, 185, 129, 0.12)', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s, opacity 0.15s' }}
                >
                  <SolidActionChat size={16} />
                </button>
                <button
                  title={t('Editar')}
                  onClick={() => onEdit(c)}
                  className="btn-icon"
                  style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s, opacity 0.15s' }}
                >
                  <SolidActionEdit size={16} />
                </button>
                <button
                  title={t('Excluir')}
                  onClick={() => onDelete(c)}
                  className="btn-icon"
                  style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239, 68, 68, 0.12)', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s, opacity 0.15s' }}
                >
                  <SolidActionTrash size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

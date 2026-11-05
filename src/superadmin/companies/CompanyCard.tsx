import React from 'react';
import { CreditCard, Edit2, Eye, Trash2, Users } from 'lucide-react';
import { STATUS_BADGE, type Company } from './types';

interface Props {
  company: Company;
  onEdit: (company: Company) => void;
  onDelete: (id: string) => void;
}

/**
 * Card de uma empresa no grid da pagina de Empresas (SuperAdmin).
 * Layout original restaurado em v1.0.112 (antes do refactor para tabela).
 */
export const CompanyCard: React.FC<Props> = ({ company, onEdit, onDelete }) => (
  <div className="company-card">
    <div className="company-card-header">
      <div className="company-avatar" style={{ background: company.primaryColor }}>
        {company.logoText.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="company-name">{company.name}</p>
        <p className="company-domain">{company.domain}</p>
      </div>
      <span className={`badge ${STATUS_BADGE[company.status]}`}>{company.status}</span>
    </div>

    <div className="company-meta">
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <CreditCard size={13} color="var(--text-muted)" />
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {company.plan}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Users size={13} color="var(--text-muted)" />
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {company.users} usuários
        </span>
      </div>
      <div style={{ marginLeft: 'auto', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        {company.revenue}/mês
      </div>
    </div>

    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      Admin: {company.adminEmail || '—'}
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: company.primaryColor,
          border: '2px solid rgba(0,0,0,0.1)',
        }}
      />
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Cor primária: {company.primaryColor}
      </span>
    </div>

    <div className="company-actions">
      <button className="btn btn-secondary btn-sm" onClick={() => onEdit(company)}>
        <Edit2 size={13} />
        Editar
      </button>
      <button
        className="btn btn-ghost btn-sm"
        title="Acesso ao painel da empresa (em breve)"
      >
        <Eye size={13} />
        Acessar
      </button>
      <button
        className="btn btn-ghost btn-sm"
        style={{ color: 'var(--danger)' }}
        onClick={() => onDelete(company.id)}
        title="Remover empresa"
      >
        <Trash2 size={13} />
      </button>
    </div>
  </div>
);

import React from 'react';
import { Edit2, Eye, Loader2, Search, Trash2 } from 'lucide-react';
import { STATUS_BADGE, type Company } from './types';

interface Props {
  companies: Company[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onEdit: (company: Company) => void;
  onDelete: (id: string) => void;
}

export const CompaniesTable: React.FC<Props> = ({
  companies,
  loading,
  search,
  onSearchChange,
  onEdit,
  onDelete,
}) => (
  <div className="card">
    <div className="card-header">
      <div className="search-wrap">
        <Search size={16} />
        <input
          className="input"
          placeholder="Buscar empresa..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Empresa</th>
            <th>Plano</th>
            <th>Usuários</th>
            <th>Status</th>
            <th>Receita</th>
            <th>Admin</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>
                <Loader2 size={20} className="spin" />
              </td>
            </tr>
          ) : companies.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                Nenhuma empresa encontrada
              </td>
            </tr>
          ) : companies.map((c) => (
            <tr key={c.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: c.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.8125rem' }}>
                    {c.logoText.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>{c.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{c.domain}</p>
                  </div>
                </div>
              </td>
              <td>{c.plan}</td>
              <td>{c.users}</td>
              <td><span className={`badge ${STATUS_BADGE[c.status]}`}>{c.status}</span></td>
              <td>{c.revenue}</td>
              <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{c.adminEmail || '—'}</td>
              <td>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost btn-icon" onClick={() => onEdit(c)} title="Editar">
                    <Edit2 size={13} />
                  </button>
                  <button className="btn btn-ghost btn-icon" onClick={() => onDelete(c.id)} title="Remover">
                    <Trash2 size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

interface StatsProps {
  companies: Company[];
}

export const CompaniesStats: React.FC<StatsProps> = ({ companies }) => (
  <div className="stats-grid">
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary-text)' }}>
        <Eye size={20} />
      </div>
      <div>
        <div className="stat-card-value">{companies.length}</div>
        <div className="stat-card-label">Empresas</div>
      </div>
    </div>
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
        <Eye size={20} />
      </div>
      <div>
        <div className="stat-card-value">{companies.filter((c) => c.status === 'Ativo').length}</div>
        <div className="stat-card-label">Ativas</div>
      </div>
    </div>
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
        <Eye size={20} />
      </div>
      <div>
        <div className="stat-card-value">{companies.reduce((sum, c) => sum + c.users, 0)}</div>
        <div className="stat-card-label">Usuários</div>
      </div>
    </div>
  </div>
);

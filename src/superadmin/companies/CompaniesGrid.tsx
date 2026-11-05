import React from 'react';
import { Loader2, Search } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { CompanyCard } from './CompanyCard';
import type { Company } from './types';

interface Props {
  companies: Company[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onEdit: (company: Company) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

/**
 * Busca + grid de cards das empresas (layout original da pagina).
 * O grid usa `repeat(auto-fill, minmax(320px, 1fr))` para manter os
 * cards lado a lado no desktop e empilhados no mobile.
 */
export const CompaniesGrid: React.FC<Props> = ({
  companies,
  loading,
  search,
  onSearchChange,
  onEdit,
  onDelete,
  onCreate,
}) => (
  <>
    <div className="card card-p" style={{ padding: '14px 20px' }}>
      <div className="search-wrap" style={{ maxWidth: 400 }}>
        <Search size={15} />
        <input
          placeholder="Buscar empresa, domínio, email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>

    {loading ? (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 size={32} className="animate-spin" color="#6366f1" />
          <p style={{ color: 'var(--text-muted)' }}>Carregando empresas...</p>
        </div>
      </div>
    ) : companies.length === 0 ? (
      <EmptyState
        title="Nenhuma empresa encontrada"
        description={
          search
            ? 'Nenhuma empresa corresponde à busca. Ajuste o termo ou cadastre uma nova empresa.'
            : 'Cadastre a primeira empresa da plataforma para começar.'
        }
        actionLabel="Nova Empresa"
        onAction={onCreate}
      />
    ) : (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {companies.map((company) => (
          <CompanyCard
            key={company.id}
            company={company}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    )}
  </>
);

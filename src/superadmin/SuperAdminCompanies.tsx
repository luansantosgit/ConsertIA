import React, { useState, useEffect } from 'react';
import { useThemeStore } from '@/stores/theme.store';
import {
  Plus, Search, Edit2, Trash2,
  Users, CreditCard, Eye, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ConfirmModal } from '@/components/ConfirmModal';

interface DbTenant {
  id: string;
  name: string;
  slug: string;
  plan_id: string;
  active: boolean;
  created_at: string;
  theme_color?: string;
  admin_email?: string;
}

interface DbPlan {
  id: string;
  name: string;
  price: number;
}


interface Company {
  id: string;
  name: string;
  domain: string;
  plan: string;
  users: number;
  status: 'Ativo' | 'Trial' | 'Inativo' | 'Inadimplente';
  revenue: string;
  primaryColor: string;
  logoText: string;
  joined: string;
  adminEmail: string;
  plan_id?: string;
  slug?: string;
  theme_color?: string;
}

const STATUS_BADGE: Record<string, string> = {
  Ativo: 'badge-success',
  Trial: 'badge-warning',
  Inativo: 'badge-gray',
  Inadimplente: 'badge-danger',
};


export const SuperAdminCompanies: React.FC = () => {
  const { setTenantTheme } = useThemeStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<Partial<Company>>({});
  const [plansList, setPlansList] = useState<{ id: string; name: string }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, plansRes, usersRes] = await Promise.all([
        supabase.from('tenants').select('*').order('created_at', { ascending: false }),
        supabase.from('plans').select('id, name, price').order('price', { ascending: true }),
        supabase.from('users').select('id, tenant_id'),
      ]);

      const tenants = tenantsRes.data || [];
      const plans = plansRes.data || [];
      const users = usersRes.data || [];

      setPlansList(plans.map((p: DbPlan) => ({ id: p.id, name: p.name })));

      const priceMap: Record<string, number> = {};
      const nameMap: Record<string, string> = {};
      for (const p of plans) { priceMap[p.id] = p.price; nameMap[p.id] = p.name; }

      const usersByTenant: Record<string, number> = {};
      for (const u of users) { usersByTenant[u.tenant_id] = (usersByTenant[u.tenant_id] || 0) + 1; }

      const mapped: Company[] = tenants.map((t: DbTenant) => ({
        id: t.id,
        name: t.name,
        domain: t.slug ? `${t.slug}.consertia.app` : '',
        plan: nameMap[t.plan_id] || 'Sem plano',
        users: usersByTenant[t.id] || 0,
        status: t.active ? 'Ativo' : 'Inativo',
        revenue: `R$${priceMap[t.plan_id] || 0}`,
        primaryColor: t.theme_color || '#6366f1',
        logoText: t.name,
        joined: new Date(t.created_at).toLocaleDateString('pt-BR'),
        adminEmail: t.admin_email || '',
        plan_id: t.plan_id,
        slug: t.slug,
        theme_color: t.theme_color,
      }));

      setCompanies(mapped);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.domain.toLowerCase().includes(search.toLowerCase()) ||
      c.adminEmail.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditingCompany(null);
    setForm({ status: 'Ativo', plan_id: plansList[0]?.id || '', primaryColor: '#2563eb', logoText: '' });
    setShowModal(true);
  };

  const openEdit = (c: Company) => {
    setEditingCompany(c);
    setForm({ ...c });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const isActive = form.status ? form.status === 'Ativo' || form.status === 'Trial' : true;
      if (editingCompany) {
        const { error } = await supabase
          .from('tenants')
          .update({
            name: form.name,
            slug: form.slug,
            plan_id: form.plan_id || null,
            theme_color: form.primaryColor,
            admin_email: form.adminEmail,
            active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCompany.id);
        if (error) throw error;
        if (editingCompany.id && form.primaryColor) {
          setTenantTheme(editingCompany.id, {
            primaryColor: form.primaryColor,
            primaryDark: form.primaryColor,
            logoText: form.logoText || editingCompany.logoText,
            tenantId: editingCompany.id,
          });
        }
      } else {
        const slug = (form.name || '').toLowerCase().replace(/\s+/g, '-');
        const { error } = await supabase.from('tenants').insert({
          name: form.name,
          slug,
          plan_id: form.plan_id || null,
          theme_color: form.primaryColor || '#2563eb',
          admin_email: form.adminEmail || '',
          active: isActive,
        });
        if (error) throw error;
        const tenantId = slug;
        setTenantTheme(tenantId, {
          tenantId,
          primaryColor: form.primaryColor || '#2563eb',
          primaryDark: form.primaryColor || '#2563eb',
          logoText: form.logoText || form.name || '',
          logoUrl: null,
          faviconUrl: null,
          sidebarDark: true,
        });
      }
      setShowModal(false);
      await fetchData();
    } catch (error) {
      console.error('Error saving company:', error);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete({ isOpen: true, id });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete.id) return;
    try {
      const { error } = await supabase.from('tenants').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting company:', error);
    } finally {
      setConfirmDelete({ isOpen: false, id: null });
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Empresas</h1>
          <p className="page-subtitle">{companies.length} empresas cadastradas na plataforma</p>
        </div>
        <button
          className="btn"
          onClick={openNew}
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none' }}
        >
          <Plus size={16} />
          Nova Empresa
        </button>
      </div>

      {/* Search */}
      <div className="card card-p" style={{ padding: '14px 20px' }}>
        <div className="header-search" style={{ maxWidth: 400 }}>
          <Search size={15} className="header-search-icon" />
          <input
            placeholder="Buscar empresa, domínio, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Loader2 size={32} className="animate-spin" color="#6366f1" />
            <p style={{ color: 'var(--text-muted)' }}>Carregando empresas...</p>
          </div>
        </div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {filtered.map((company) => (
          <div key={company.id} className="company-card">
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
              Admin: {company.adminEmail}
            </div>

            {/* Color swatch */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                background: company.primaryColor,
                border: '2px solid rgba(0,0,0,0.1)',
              }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Cor primária: {company.primaryColor}
              </span>
            </div>

            <div className="company-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(company)}>
                <Edit2 size={13} />
                Editar
              </button>
              <button className="btn btn-ghost btn-sm">
                <Eye size={13} />
                Acessar
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger)' }}
                onClick={() => handleDelete(company.id)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nome da empresa *</label>
                <input
                  className="input"
                  value={form.name || ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: TechAssist Ltda"
                />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail do administrador *</label>
                <input
                  className="input"
                  type="email"
                  value={form.adminEmail || ''}
                  onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                  placeholder="admin@empresa.com"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Plano</label>
                  <select
                    className="select"
                    value={form.plan_id || ''}
                    onChange={(e) => setForm((f) => ({ ...f, plan_id: e.target.value }))}
                  >
                    <option value="">Sem plano</option>
                    {plansList.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="select"
                    value={form.status || 'Trial'}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Company['status'] }))}
                  >
                    <option>Trial</option>
                    <option>Ativo</option>
                    <option>Inativo</option>
                    <option>Inadimplente</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nome da marca (logo texto)</label>
                  <input
                    className="input"
                    value={form.logoText || ''}
                    onChange={(e) => setForm((f) => ({ ...f, logoText: e.target.value }))}
                    placeholder="Ex: TechAssist"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cor primária</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={form.primaryColor || '#2563eb'}
                      onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                      style={{ width: 42, height: 38, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2 }}
                    />
                    <input
                      className="input"
                      value={form.primaryColor || '#2563eb'}
                      onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </div>
              {/* Preview */}
              <div style={{ padding: '14px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>PREVIEW</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: form.primaryColor || '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                    {(form.logoText || form.name || 'E').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{form.logoText || form.name || 'Nome da empresa'}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CRM + IA</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button
                className="btn"
                onClick={handleSave}
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none' }}
              >
                {editingCompany ? 'Salvar alterações' : 'Criar empresa'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={confirmDeleteAction}
        title="Remover empresa"
        message="Tem certeza que deseja remover esta empresa? Todos os dados associados serão perdidos. Esta ação não pode ser desfeita."
        variant="danger"
      />
    </div>
  );
};

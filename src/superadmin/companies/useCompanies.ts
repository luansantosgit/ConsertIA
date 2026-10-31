import { useState, useEffect } from 'react';
import { useThemeStore } from '@/stores/theme.store';
import { supabase } from '@/lib/supabase';
import {
  createCompany,
  finalizeCompanyWizard,
  resetCompanyPassword,
} from './companyActions';
import type { Company, Credentials, DbPlan, DbTenant } from './types';

/** Carrega tenants, planos e contagem de admins por tenant. */
function mapCompanies(
  tenants: DbTenant[],
  plans: DbPlan[],
  users: { id: string; tenant_id: string; role: string }[],
): Company[] {
  const priceMap: Record<string, number> = {};
  const nameMap: Record<string, string> = {};
  for (const p of plans) { priceMap[p.id] = p.price; nameMap[p.id] = p.name; }

  const usersByTenant: Record<string, number> = {};
  const adminsByTenant: Record<string, number> = {};
  for (const u of users) {
    usersByTenant[u.tenant_id] = (usersByTenant[u.tenant_id] || 0) + 1;
    if (u.role === 'admin') {
      adminsByTenant[u.tenant_id] = (adminsByTenant[u.tenant_id] || 0) + 1;
    }
  }

  return tenants.map((t) => ({
    id: t.id,
    name: t.name,
    domain: t.slug ? `${t.slug}.deeperia.com.br` : '',
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
    subscription_due_date: t.subscription_due_date ?? null,
    subscription_extra_days: t.subscription_extra_days ?? 0,
    adminCount: adminsByTenant[t.id] || 0,
  }));
}

const CREATE_ERRORS: Record<string, string> = {
  email_exists: 'Este e-mail já possui uma conta. Use outro e-mail.',
  invalid_email: 'Informe um e-mail válido.',
  invalid_name: 'Informe o nome da empresa.',
};

export function useCompanies() {
  const { setTenantTheme } = useThemeStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<Partial<Company>>({});
  const [plansList, setPlansList] = useState<{ id: string; name: string }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmWizardFinish, setConfirmWizardFinish] = useState(false);
  const [finalizingWizard, setFinalizingWizard] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, plansRes, usersRes] = await Promise.all([
        supabase.from('tenants').select('*').order('created_at', { ascending: false }),
        supabase.from('plans').select('id, name, price').order('price', { ascending: true }),
        supabase.from('users').select('id, tenant_id, role'),
      ]);
      const plans = plansRes.data || [];
      setPlansList(plans.map((p: DbPlan) => ({ id: p.id, name: p.name })));
      setCompanies(mapCompanies(tenantsRes.data || [], plans, usersRes.data || []));
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.domain.toLowerCase().includes(search.toLowerCase()) ||
      c.adminEmail.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditingCompany(null);
    setForm({ status: 'Ativo', plan_id: plansList[0]?.id || '', primaryColor: '#2563eb', logoText: '', adminEmail: '', subscription_due_date: null, subscription_extra_days: 0 });
    setSaveError(null);
    setShowModal(true);
  };

  const openEdit = (c: Company) => {
    setEditingCompany(c);
    setForm({ ...c });
    setSaveError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
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
            subscription_due_date: form.subscription_due_date || null,
            subscription_extra_days: Number(form.subscription_extra_days) || 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCompany.id);
        if (error) throw error;
        if (form.primaryColor) {
          setTenantTheme(editingCompany.id, {
            primaryColor: form.primaryColor,
            primaryDark: form.primaryColor,
            logoText: form.logoText || editingCompany.logoText,
            tenantId: editingCompany.id,
          });
        }
      } else {
        // Criação: a edge gera senha aleatória, cria tenant + usuário admin
        try {
          const created = await createCompany(form);
          setCredentials({ ...created, company: form.name || '' });
        } catch (err) {
          const code = (err as Error).message;
          throw new Error(CREATE_ERRORS[code] ?? `Erro ao criar empresa: ${code}`);
        }
      }
      setShowModal(false);
      await fetchData();
    } catch (error) {
      console.error('Error saving company:', error);
      setSaveError((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /** Regera a senha aleatoria do admin da empresa via edge (superadmin). */
  const handleResetPassword = async () => {
    if (resetting || !editingCompany) return;
    setResetting(true);
    try {
      const reset = await resetCompanyPassword(editingCompany.id);
      setCredentials({ ...reset, company: editingCompany.name || '' });
      setShowModal(false);
      setConfirmReset(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      const code = (error as Error).message;
      setSaveError(code === 'user_not_found' ? 'Empresa sem usuário admin cadastrado.' : `Falha ao regerar senha: ${code}`);
      setConfirmReset(false);
    } finally {
      setResetting(false);
    }
  };

  /** Finaliza o wizard manualmente: ativa a empresa e cria o admin (pagamento direto). */
  const handleWizardFinalize = async () => {
    if (finalizingWizard || !editingCompany) return;
    setFinalizingWizard(true);
    try {
      const email = (form.adminEmail || editingCompany.adminEmail || '').trim();
      if (!email) throw new Error('Informe o e-mail do administrador antes de finalizar.');

      const finalized = await finalizeCompanyWizard(
        editingCompany.id,
        email,
        form.plan_id || editingCompany.plan_id || '',
      );
      setCredentials({ ...finalized, company: editingCompany.name || '' });
      setShowModal(false);
      setConfirmWizardFinish(false);
      await fetchData();
    } catch (error) {
      console.error('Error finalizing wizard:', error);
      setSaveError((error as Error).message);
      setConfirmWizardFinish(false);
    } finally {
      setFinalizingWizard(false);
    }
  };

  const handleDelete = (id: string) => setConfirmDelete({ isOpen: true, id });

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

  return {
    companies, filtered, loading, search, setSearch,
    showModal, setShowModal, editingCompany, form, setForm,
    plansList, confirmDelete, setConfirmDelete,
    saving, saveError, setSaveError, credentials, setCredentials,
    confirmReset, setConfirmReset, resetting,
    confirmWizardFinish, setConfirmWizardFinish, finalizingWizard,
    openNew, openEdit, handleSave, handleDelete, confirmDeleteAction,
    handleResetPassword, handleWizardFinalize,
  };
}

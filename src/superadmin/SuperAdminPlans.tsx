import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Check, Edit2, Trash2, Users, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import { ConfirmModal } from '@/components/ConfirmModal';

interface DbPlan {
  id: string;
  name: string;
  price: number;
  max_users?: number;
  max_os?: number;
  max_whatsapp_channels?: number;
  ai_token_limit?: number;
  custom_branding?: boolean;
  features?: string[];
  featured?: boolean;
  active?: boolean;
}


interface Plan {
  id: string;
  name: string;
  price: number;
  maxUsers: number;
  maxOS: number;
  maxWhatsAppChannels: number;
  aiTokenLimit: number;
  customBranding: boolean;
  features: string[];
  featured: boolean;
  active: boolean;
  companies: number;
}

const FEATURES_DEFAULTS: Record<string, string[]> = {
  starter: ['Até 3 usuários', 'Até 100 OS/mês', 'Dashboard básico', 'Clientes ilimitados', 'Suporte por e-mail'],
  profissional: ['Até 10 usuários', 'Até 500 OS/mês', 'Dashboard avançado', 'Relatórios completos', 'IA para diagnóstico', 'Suporte prioritário'],
  empresarial: ['Usuários ilimitados', 'OS ilimitadas', 'Múltiplas filiais', 'API de integração', 'IA avançada', 'Gerente de conta dedicado', 'SLA 99.9%'],
};

export const SuperAdminPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<Partial<Plan>>({});
  const [featuresText, setFeaturesText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const [plansRes, tenantsRes] = await Promise.all([
        supabase.from('plans').select('*').order('price', { ascending: true }),
        supabase.from('tenants').select('id, plan_id'),
      ]);

      const dbPlans = plansRes.data || [];
      const tenants = tenantsRes.data || [];

      const countByPlan: Record<string, number> = {};
      for (const t of tenants) {
        if (t.plan_id) countByPlan[t.plan_id] = (countByPlan[t.plan_id] || 0) + 1;
      }

      const mapped: Plan[] = dbPlans.map((p: DbPlan) => ({
        id: p.id,
        name: p.name,
        price: p.price || 0,
        maxUsers: p.max_users || 3,
        maxOS: p.max_os || 100,
        maxWhatsAppChannels: p.max_whatsapp_channels ?? 1,
        aiTokenLimit: p.ai_token_limit ?? 0,
        customBranding: p.custom_branding === true,
        features: p.features || FEATURES_DEFAULTS[p.id] || [],
        featured: p.featured || false,
        active: p.active !== false,
        companies: countByPlan[p.id] || 0,
      }));

      setPlans(mapped);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditingPlan(null);
    setForm({ active: true, featured: false, companies: 0 });
    setFeaturesText('');
    setShowModal(true);
  };

  const openEdit = (p: Plan) => {
    setEditingPlan(p);
    setForm({ ...p });
    setFeaturesText(p.features.join('\n'));
    setShowModal(true);
  };

  const handleSave = async () => {
    const features = featuresText.split('\n').map((f) => f.trim()).filter(Boolean);
    try {
      if (editingPlan) {
        const { error } = await supabase
          .from('plans')
          .update({
            name: form.name,
            price: form.price,
            max_users: form.maxUsers,
            max_os: form.maxOS,
            max_whatsapp_channels: form.maxWhatsAppChannels ?? 1,
            ai_token_limit: form.aiTokenLimit ?? 0,
            custom_branding: form.customBranding || false,
            features,
            featured: form.featured || false,
            active: form.active !== false,
          })
          .eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('plans').insert({
          name: form.name,
          price: form.price || 0,
          max_users: form.maxUsers || 3,
          max_os: form.maxOS || 100,
          max_whatsapp_channels: form.maxWhatsAppChannels ?? 1,
          ai_token_limit: form.aiTokenLimit ?? 0,
          custom_branding: form.customBranding || false,
          features,
          featured: form.featured || false,
          active: form.active !== false,
        });
        if (error) throw error;
      }
      setShowModal(false);
      await fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete({ isOpen: true, id });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete.id) return;
    try {
      const { error } = await supabase.from('plans').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      await fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
    } finally {
      setConfirmDelete({ isOpen: false, id: null });
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Planos</h1>
          <p className="page-subtitle">Gerencie os planos de assinatura da plataforma</p>
        </div>
        <button
          className="btn"
          onClick={openNew}
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none' }}
        >
          <Plus size={16} />
          Novo Plano
        </button>
      </div>

      {/* Summary cards */}
      <div className="stat-cards">
        {plans.map((p) => (
          <div key={p.id} className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{ background: '#ede9fe' }}>
                <CreditCard size={20} color="#6366f1" />
              </div>
              {p.featured && (
                <span className="badge badge-primary">
                  <Zap size={10} />
                  Popular
                </span>
              )}
            </div>
            <div>
              <p className="stat-card-value">{formatCurrency(p.price)}</p>
              <p className="stat-card-label">{p.name} · {p.companies} empresas</p>
            </div>
          </div>
        ))}
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: '#d1fae5' }}>
              <Users size={20} color="#10b981" />
            </div>
          </div>
          <div>
            <p className="stat-card-value">{formatCurrency(plans.reduce((a, p) => a + p.price * p.companies, 0))}</p>
            <p className="stat-card-label">MRR Total</p>
          </div>
        </div>
      </div>

      {/* Plan cards */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Loader2 size={32} className="animate-spin" color="#6366f1" />
            <p style={{ color: 'var(--text-muted)' }}>Carregando planos...</p>
          </div>
        </div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="plan-card"
            style={{ borderColor: plan.featured ? 'var(--primary)' : undefined, position: 'relative' }}
          >
            {plan.featured && <span className="plan-badge">Mais popular</span>}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <p className="plan-name">{plan.name}</p>
                <span className={`badge ${plan.active ? 'badge-success' : 'badge-gray'}`}>
                  {plan.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span className="plan-price">{formatCurrency(plan.price)}</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>/mês</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {plan.companies} empresa{plan.companies !== 1 ? 's' : ''} usando este plano
              </p>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                LIMITES
              </p>
              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                    {plan.maxUsers >= 9999 ? '∞' : plan.maxUsers}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Usuários</p>
                </div>
                <div>
                  <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                    {plan.maxOS >= 9999 ? '∞' : plan.maxOS}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OS/mês</p>
                </div>
              </div>
            </div>

            <ul className="plan-features">
              {plan.features.map((f) => (
                <li key={f}>
                  <Check size={14} color="var(--success)" style={{ flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openEdit(plan)}>
                <Edit2 size={13} />
                Editar
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger)' }}
                onClick={() => handleDelete(plan.id)}
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
                {editingPlan ? 'Editar Plano' : 'Novo Plano'}
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nome do plano *</label>
                  <input
                    className="input"
                    value={form.name || ''}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Profissional"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Preço (R$/mês) *</label>
                  <input
                    className="input"
                    type="number"
                    value={form.price || ''}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    placeholder="499"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Máx. usuários</label>
                  <input
                    className="input"
                    type="number"
                    value={form.maxUsers || ''}
                    onChange={(e) => setForm((f) => ({ ...f, maxUsers: Number(e.target.value) }))}
                    placeholder="10"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Máx. OS por mês</label>
                  <input
                    className="input"
                    type="number"
                    value={form.maxOS || ''}
                    onChange={(e) => setForm((f) => ({ ...f, maxOS: Number(e.target.value) }))}
                    placeholder="500"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Limite de tokens de IA/mês</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={form.aiTokenLimit ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, aiTokenLimit: Number(e.target.value) }))}
                    placeholder="500000"
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Cota mensal do agente de IA no token central da plataforma (0 = ilimitado).
                  </p>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Máx. canais WhatsApp</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.maxWhatsAppChannels ?? 1}
                  onChange={(e) => setForm((f) => ({ ...f, maxWhatsAppChannels: Number(e.target.value) }))}
                  placeholder="1"
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Quantidade máxima de canais WhatsApp (API Oficial + API Alternativa) que a empresa pode conectar.
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Funcionalidades (uma por linha)</label>
                <textarea
                  className="textarea"
                  rows={5}
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder={'Até 10 usuários\nAté 500 OS/mês\nRelatórios completos'}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={form.featured || false}
                    onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                  />
                  Destacar como "mais popular"
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={form.active !== false}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  />
                  Plano ativo
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={form.customBranding || false}
                    onChange={(e) => setForm((f) => ({ ...f, customBranding: e.target.checked }))}
                  />
                  Personalização de marca (logo/cor próprios)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button
                className="btn"
                onClick={handleSave}
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none' }}
              >
                {editingPlan ? 'Salvar alterações' : 'Criar plano'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={confirmDeleteAction}
        title="Remover plano"
        message="Tem certeza que deseja remover este plano? Esta ação não pode ser desfeita."
        variant="danger"
      />
    </div>
  );
};

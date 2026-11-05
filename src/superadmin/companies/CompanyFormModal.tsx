import React from 'react';
import { Brain, KeyRound } from 'lucide-react';
import type { Company } from './types';

interface Props {
  editingCompany: Company | null;
  form: Partial<Company>;
  plans: { id: string; name: string }[];
  saving: boolean;
  saveError: string | null;
  onChange: (patch: Partial<Company>) => void;
  onClose: () => void;
  onSave: () => void;
  onRequestReset: () => void;
  onRequestFinalize: () => void;
}

export const CompanyFormModal: React.FC<Props> = ({
  editingCompany,
  form,
  plans,
  saving,
  saveError,
  onChange,
  onClose,
  onSave,
  onRequestReset,
  onRequestFinalize,
}) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3 className="modal-title">{editingCompany ? 'Editar Empresa' : 'Nova Empresa'}</h3>
        <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <div className="form-group">
          <label className="form-label">Nome da empresa *</label>
          <input
            className="input"
            value={form.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ex: TechAssist Ltda"
          />
        </div>
        <div className="form-group">
          <label className="form-label">E-mail do administrador *</label>
          <input
            className="input"
            type="email"
            value={form.adminEmail || ''}
            onChange={(e) => onChange({ adminEmail: e.target.value })}
            placeholder="admin@empresa.com"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Plano</label>
            <select
              className="select"
              value={form.plan_id || ''}
              onChange={(e) => onChange({ plan_id: e.target.value })}
            >
              <option value="">Sem plano</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="select"
              value={form.status || 'Trial'}
              onChange={(e) => onChange({ status: e.target.value as Company['status'] })}
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
            <label className="form-label">Vencimento da assinatura</label>
            <input
              className="input"
              type="date"
              value={form.subscription_due_date || ''}
              onChange={(e) => onChange({ subscription_due_date: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Prazo extra (dias)</label>
            <input
              className="input"
              type="number"
              min={0}
              value={form.subscription_extra_days ?? 0}
              onChange={(e) => onChange({ subscription_extra_days: Number(e.target.value) })}
              title="Dias extras além da carência global, para empresas com fatura vencida"
            />
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 4, margin: 0 }}>
              Some-se à carência global. Use para conceder mais tempo a empresas inadimplentes.
            </p>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nome da marca (logo texto)</label>
            <input
              className="input"
              value={form.logoText || ''}
              onChange={(e) => onChange({ logoText: e.target.value })}
              placeholder="Ex: TechAssist"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Cor primária</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color"
                value={form.primaryColor || '#2563eb'}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                style={{ width: 42, height: 38, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2 }}
              />
              <input
                className="input"
                value={form.primaryColor || '#2563eb'}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </div>
        <div style={{ padding: '14px', background: 'var(--hover-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
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
        {saveError && (
          <p style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, margin: 0, flex: 1 }}>
            {saveError}
          </p>
        )}
        {editingCompany && editingCompany.adminCount > 0 && (
          <button
            className="btn btn-secondary"
            onClick={onRequestReset}
            title="Gera uma nova senha aleatória para o administrador desta empresa"
          >
            <KeyRound size={15} /> Regerar senha
          </button>
        )}
        {editingCompany && editingCompany.adminCount === 0 && (
          <button
            className="btn btn-secondary"
            onClick={onRequestFinalize}
            title="Confirma o pagamento recebido e conclui o cadastro, criando o administrador"
          >
            <Brain size={15} /> Finalizar cadastro
          </button>
        )}
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
        <button
          className="btn"
          onClick={onSave}
          disabled={saving}
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none' }}
        >
          {saving ? 'Criando...' : editingCompany ? 'Salvar alterações' : 'Criar empresa'}
        </button>
      </div>
    </div>
  </div>
);

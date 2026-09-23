import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Customer } from '@/types';
import { CustomerRepository } from '@/repositories/customer.repository';
import { useTranslation } from '@/hooks/useTranslation';

const customerRepo = new CustomerRepository();

interface CustomerModalProps {
  customer: Customer | null;
  onClose: () => void;
  onSave: (c: Customer) => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ customer, onClose, onSave }) => {
  const { t } = useTranslation();
  const isNew = !customer;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Customer>>(customer || {
    tenant_id: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const set = (k: keyof Customer, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (isNew) {
        const created = await customerRepo.create({
          name: form.name,
          email: form.email,
          phone: form.phone,
          mobile: form.mobile,
          cpf_cnpj: form.cpf_cnpj,
          address: form.address,
          city: form.city,
          state: form.state,
          zip_code: form.zip_code,
          notes: form.notes,
        });
        onSave(created);
      } else {
        const updated = await customerRepo.update(customer!.id, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          mobile: form.mobile,
          cpf_cnpj: form.cpf_cnpj,
          address: form.address,
          city: form.city,
          state: form.state,
          zip_code: form.zip_code,
          notes: form.notes,
        });
        onSave(updated);
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isNew ? t('Novo Cliente') : t('Editar')}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('Nome')} *</label>
              <input className="input" value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Ex: João Silva" />
            </div>
            <div className="form-group">
              <label className="form-label">CPF / CNPJ</label>
              <input className="input" value={form.cpf_cnpj || ''} onChange={e => set('cpf_cnpj', e.target.value)} placeholder="000.000.000-00" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('Email')}</label>
              <input className="input" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('Telefone')} / WhatsApp</label>
              <input className="input" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('Endereço')}</label>
            <input className="input" value={form.address || ''} onChange={e => set('address', e.target.value)} placeholder="Rua, número, complemento" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('Cidade')}</label>
              <input className="input" value={form.city || ''} onChange={e => set('city', e.target.value)} placeholder="São Paulo" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('Estado')}</label>
              <select className="select" value={form.state || ''} onChange={e => set('state', e.target.value)}>
                <option value="">Selecione</option>
                {['SP','RJ','MG','RS','PR','SC','BA','GO','DF','AM','PA','CE','PE','MA'].map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('CEP')}</label>
              <input className="input" value={form.zip_code || ''} onChange={e => set('zip_code', e.target.value)} placeholder="00000-000" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('Observações')}</label>
            <textarea className="textarea" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Notas internas sobre o cliente..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{t('Cancelar')}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? t('Salvando...') : (isNew ? t('Salvar') : t('Salvar'))}
          </button>
        </div>
      </div>
    </div>
  );
};

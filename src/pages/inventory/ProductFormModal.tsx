import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Product } from '@/types';
import { ProductRepository } from '@/repositories/product.repository';
import { CurrencyInput } from '@/components/CurrencyInput';

const productRepo = new ProductRepository();

export interface StockItemForm extends Product {
  location?: string;
  category: string;
}

const EMPTY = {
  name: '', sku: '', price: '0', cost: '0', min_stock_quantity: '2',
  category: 'Displays', location: '', partType: '', deviceBrand: '', deviceModel: '',
};

// Criar/Editar produto do estoque em um único modal
export const ProductFormModal: React.FC<{
  editing: StockItemForm | null;
  onClose: () => void;
  onSaved: (product: StockItemForm, isNew: boolean) => void;
}> = ({ editing, onClose, onSaved }) => {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        sku: editing.sku,
        price: String(editing.price ?? 0),
        cost: String(editing.cost ?? 0),
        min_stock_quantity: String(editing.min_stock_quantity ?? 2),
        category: editing.category || 'Outros',
        location: editing.location ?? '',
        partType: (editing as unknown as { part_type?: string }).part_type ?? '',
        deviceBrand: (editing as unknown as { device_brand?: string }).device_brand ?? '',
        deviceModel: (editing as unknown as { device_model?: string }).device_model ?? '',
      });
    } else {
      setForm(EMPTY);
    }
    setError(null);
  }, [editing]);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || `SKU-${Date.now()}`,
        price: parseFloat(form.price) || 0,
        cost: parseFloat(form.cost) || 0,
        min_stock_quantity: parseInt(form.min_stock_quantity) || 2,
        category: form.category || 'Outros',
        location: form.location || null,
        part_type: form.partType || null,
        device_brand: form.deviceBrand || null,
        device_model: form.deviceModel || null,
      } as Partial<Product> & Record<string, unknown>;

      if (editing) {
        await productRepo.update(editing.id, payload);
        onSaved({ ...editing, ...payload, category: payload.category as string } as StockItemForm, false);
      } else {
        const created = await productRepo.create({ ...payload, stock_quantity: 0, active: true } as Partial<Product>);
        onSaved({ ...created, category: payload.category as string, location: form.location, movements: [] } as unknown as StockItemForm, true);
      }
    } catch (err) {
      setError((err as Error).message?.includes('duplicate')
        ? 'Já existe um produto com este SKU.' : 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{editing ? 'Editar Produto' : 'Novo Item de Estoque'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome do produto *</label>
              <input className="input" value={form.name} onChange={e => set('name')(e.target.value)} placeholder="Ex: Display iPhone 14 Pro" />
            </div>
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input className="input" value={form.sku} onChange={e => set('sku')(e.target.value)} placeholder="DIP14P-001" disabled={!!editing} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Preço de venda</label>
              <CurrencyInput value={Number(form.price) || 0} onChange={v => set('price')(String(v))} />
            </div>
            <div className="form-group">
              <label className="form-label">Custo</label>
              <CurrencyInput value={Number(form.cost) || 0} onChange={v => set('cost')(String(v))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <input className="input" value={form.category} onChange={e => set('category')(e.target.value)} placeholder="Displays" />
            </div>
            <div className="form-group">
              <label className="form-label">Localização</label>
              <input className="input" value={form.location} onChange={e => set('location')(e.target.value)} placeholder="Prateleira A1" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Estoque mínimo</label>
              <input className="input" type="number" min="0" value={form.min_stock_quantity} onChange={e => set('min_stock_quantity')(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Marca do aparelho</label>
              <input className="input" value={form.deviceBrand} onChange={e => set('deviceBrand')(e.target.value)} placeholder="Apple" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Modelo do aparelho</label>
              <input className="input" value={form.deviceModel} onChange={e => set('deviceModel')(e.target.value)} placeholder="iPhone 14 Pro" />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de peça</label>
              <input className="input" value={form.partType} onChange={e => set('partType')(e.target.value)} placeholder="original, compatível..." />
            </div>
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: 0 }}>{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving || !form.name.trim()}>
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Adicionar item'}
          </button>
        </div>
      </div>
    </div>
  );
};

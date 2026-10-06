import React, { useState } from 'react';
import { Plus, Trash2, Receipt } from 'lucide-react';
import { CurrencyInput } from '@/components/CurrencyInput';
import { formatCurrency } from '@/lib/format';

export interface BudgetItem {
  name: string;
  value: number;
}

// Seção de orçamento com múltiplos itens: nome + valor por linha,
// total auto-calculado. O atendente detalha cada parte do serviço.
export const BudgetItemsSection: React.FC<{
  items: BudgetItem[];
  onChange: (items: BudgetItem[]) => void;
}> = ({ items, onChange }) => {
  const [name, setName] = useState('');
  const [value, setValue] = useState(0);

  const total = items.reduce((a, i) => a + (Number(i.value) || 0), 0);

  const addItem = () => {
    if (!name.trim()) return;
    onChange([...items, { name: name.trim(), value: Number(value) || 0 }]);
    setName('');
    setValue(0);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="form-group">
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Receipt size={13} /> Orçamento
      </label>

      {/* Adicionar item */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Ex: Troca de display"
          style={{ flex: 1, marginBottom: 0 }}
        />
        <CurrencyInput value={value} onChange={v => setValue(v)} />
        <button
          className="btn btn-secondary"
          onClick={addItem}
          disabled={!name.trim()}
          style={{ flexShrink: 0 }}
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Lista de itens */}
      {items.length > 0 && (
        <div style={{
          border: '1px solid var(--border)', borderRadius: 10,
          overflow: 'hidden',
        }}>
          {items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px',
                borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none',
                background: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary, #f8fafc)',
              }}
            >
              <span style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                {item.name}
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {formatCurrency(item.value)}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => removeItem(idx)}
                style={{ color: 'var(--danger)', padding: 2 }}
                title="Remover item"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {/* Total */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px',
            background: 'var(--primary-light)',
            fontWeight: 700,
          }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--primary)' }}>TOTAL</span>
            <span style={{ fontSize: '1rem', color: 'var(--primary)' }}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

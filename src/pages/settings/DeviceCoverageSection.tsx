import React, { useEffect, useState, useCallback } from 'react';
import { Smartphone, Tablet, Laptop, Watch, Gamepad2, MonitorSmartphone } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { AiDeviceCoverageRepository } from '@/repositories/ai-templates.repository';
import type { AiDeviceCoverage } from '@/types';

const repo = new AiDeviceCoverageRepository();

const DEVICE_TYPES = [
  { key: 'smartphone', label: 'Smartphone', icon: Smartphone },
  { key: 'tablet', label: 'Tablet', icon: Tablet },
  { key: 'notebook', label: 'Notebook', icon: Laptop },
  { key: 'smartwatch', label: 'Smartwatch', icon: Watch },
  { key: 'console', label: 'Videogame', icon: Gamepad2 },
  { key: 'outros', label: 'Outros aparelhos', icon: MonitorSmartphone },
];

const BRAND_SUGGESTIONS: Record<string, string[]> = {
  smartphone: ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'LG', 'Asus', 'Google', 'Huawei'],
  tablet: ['Apple', 'Samsung', 'Xiaomi', 'Lenovo', 'Multilaser'],
  notebook: ['Dell', 'HP', 'Lenovo', 'Acer', 'Apple', 'Asus', 'Samsung'],
  smartwatch: ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Amazfit'],
  console: ['Sony', 'Microsoft', 'Nintendo'],
  outros: [],
};

export const DeviceCoverageSection: React.FC = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<AiDeviceCoverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBrand, setNewBrand] = useState<Record<string, string>>({});

  useEffect(() => {
    repo.getAll().then(setRows).catch(console.error).finally(() => setLoading(false));
  }, []);

  const findRow = useCallback(
    (deviceType: string) => rows.find(r => r.device_type === deviceType),
    [rows]
  );

  const toggleDevice = useCallback(async (deviceType: string) => {
    const existing = findRow(deviceType);
    try {
      if (existing) {
        await repo.deleteRow(deviceType);
        setRows(prev => prev.filter(r => r.device_type !== deviceType));
      } else {
        const created = await repo.upsertRow({ device_type: deviceType, brands: [], active: true });
        setRows(prev => [...prev.filter(r => r.device_type !== deviceType), created]);
      }
    } catch (err) {
      console.error('Failed to toggle device coverage:', err);
    }
  }, [findRow]);

  const toggleBrand = useCallback(async (deviceType: string, brand: string) => {
    const existing = findRow(deviceType);
    if (!existing) return;
    const brands = existing.brands.includes(brand)
      ? existing.brands.filter(b => b !== brand)
      : [...existing.brands, brand];
    try {
      const updated = await repo.upsertRow({ device_type: deviceType, brands, active: true });
      setRows(prev => prev.map(r => (r.device_type === deviceType ? updated : r)));
    } catch (err) {
      console.error('Failed to toggle brand:', err);
    }
  }, [findRow]);

  const addBrand = useCallback(async (deviceType: string) => {
    const brand = (newBrand[deviceType] ?? '').trim();
    if (!brand) return;
    await toggleBrand(deviceType, brand);
    setNewBrand(prev => ({ ...prev, [deviceType]: '' }));
  }, [newBrand, toggleBrand]);

  if (loading) {
    return <div className="card card-p"><div className="skeleton" style={{ height: 80 }} /></div>;
  }

  return (
    <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>{t('Aparelhos Atendidos')}</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {t('Selecione com quais tipos de aparelho e marcas a sua empresa trabalha. O agente de IA atende com base nesta lista e transfere para um atendente qualquer aparelho fora dela.')}
        </p>
      </div>

      {DEVICE_TYPES.map(({ key, label, icon: Icon }) => {
        const row = findRow(key);
        const enabled = Boolean(row);
        const brands = row?.brands ?? [];
        const suggestions = BRAND_SUGGESTIONS[key] ?? [];
        return (
          <div key={key} style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: enabled ? 12 : 0 }}>
              <input
                type="checkbox" checked={enabled}
                onChange={() => toggleDevice(key)}
                style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
              />
              <Icon size={16} color={enabled ? 'var(--primary)' : 'var(--text-muted)'} />
              <strong style={{ fontSize: '0.875rem' }}>{t(label)}</strong>
            </label>

            {enabled && (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {[...new Set([...suggestions, ...brands])].map(brand => (
                    <button
                      key={brand}
                      type="button"
                      className={`btn btn-sm btn-pill ${brands.includes(brand) ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => toggleBrand(key, brand)}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input" value={newBrand[key] ?? ''}
                    onChange={e => setNewBrand(prev => ({ ...prev, [key]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') addBrand(key); }}
                    placeholder={t('Adicionar outra marca...')}
                    style={{ maxWidth: 240 }}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={() => addBrand(key)}>{t('Adicionar')}</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

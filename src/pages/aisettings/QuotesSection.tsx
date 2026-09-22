import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import type { AiQuoteSettings } from '@/types';

interface QuotesSectionProps {
  quote: AiQuoteSettings | null;
  saving: boolean;
  saved: boolean;
  onSave: (partial: Partial<AiQuoteSettings>) => void;
}

const VARIABLES = ['{cliente}', '{empresa}', '{aparelho}', '{servico}', '{peca}', '{valor_peca}', '{mao_obra}', '{valor_total}', '{total}'];

export const QuotesSection: React.FC<QuotesSectionProps> = ({ quote, saving, saved, onSave }) => {
  const { t } = useTranslation();
  const [template, setTemplate] = useState('');
  const [laborValue, setLaborValue] = useState(0);
  const [initialized, setInitialized] = useState(false);

  if (!quote) return null;
  if (!initialized) {
    setTemplate(quote.quote_template);
    setLaborValue(quote.labor_value);
    setInitialized(true);
  }

  const save = () => {
    onSave({
      quote_template: template,
      labor_enabled: quote.labor_enabled,
      labor_mode: quote.labor_mode,
      labor_type: quote.labor_type,
      labor_value: Number(laborValue) || 0,
    });
  };

  return (
    <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{t('Orçamentos')}</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {t('Template usado pelo agente para passar orçamentos. Os valores são calculados com o preço real da peça no catálogo.')}
        </p>
      </div>

      <div className="form-group">
        <label className="form-label">{t('Template de orçamento')}</label>
        <textarea
          className="input" rows={7} style={{ resize: 'vertical', fontFamily: 'inherit' }}
          value={template}
          onChange={e => setTemplate(e.target.value)}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {VARIABLES.map(variable => (
            <button
              key={variable}
              type="button"
              className="badge badge-secondary"
              style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit', fontSize: '0.7rem' }}
              onClick={() => setTemplate(v => v + variable)}
            >
              {variable}
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <h4 style={{ fontWeight: 700, fontSize: '0.9375rem', margin: '0 0 12' }}>{t('Mão de obra')}</h4>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', cursor: 'pointer', marginBottom: 12 }}>
          <input
            type="checkbox" checked={quote.labor_enabled}
            onChange={e => onSave({ labor_enabled: e.target.checked })}
            style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
          />
          {t('Adicionar cálculo de mão de obra ao orçamento')}
        </label>

        {quote.labor_enabled && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">{t('Como exibir ao cliente')}</label>
              <select className="select" value={quote.labor_mode} onChange={e => onSave({ labor_mode: e.target.value as 'separate' | 'included' })}>
                <option value="included">{t('Somar tudo sem citar a parte')}</option>
                <option value="separate">{t('Informar peça + mão de obra separadamente')}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('Tipo de cálculo')}</label>
              <select className="select" value={quote.labor_type} onChange={e => onSave({ labor_type: e.target.value as 'fixed' | 'percent' })}>
                <option value="fixed">{t('Valor fixo (R$)')}</option>
                <option value="percent">{t('Percentual sobre a peça (%)')}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{quote.labor_type === 'fixed' ? t('Valor da mão de obra (R$)') : t('Percentual (%)')}</label>
              <input className="input" type="number" step="0.01" value={laborValue} onChange={e => setLaborValue(Number(e.target.value))} />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{t('Salvar configurações')}</button>
        {saved && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: '#16a34a' }}>
            <Check size={14} /> {t('Configurações salvas!')}
          </span>
        )}
      </div>
    </div>
  );
};

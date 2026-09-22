import React from 'react';
import { Smartphone, Layers, Check } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import type { AiDiagnosisSettings } from '@/types';

interface DiagnosisSectionProps {
  diagnosis: AiDiagnosisSettings | null;
  saving: boolean;
  saved: boolean;
  onSave: (partial: Partial<AiDiagnosisSettings>) => void;
}

export const DiagnosisSection: React.FC<DiagnosisSectionProps> = ({ diagnosis, saving, saved, onSave }) => {
  const { t } = useTranslation();
  if (!diagnosis) return null;

  return (
    <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{t('Diagnósticos')}</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {t('Configure como o agente diagnostica problemas de tela e escolhe o tipo de reparo no orçamento.')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <button
          type="button"
          onClick={() => onSave({ repair_mode: 'screen_only' })}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 16,
            borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
            border: diagnosis.repair_mode === 'screen_only' ? '2px solid var(--primary)' : '1px solid var(--border)',
            background: diagnosis.repair_mode === 'screen_only' ? 'var(--primary-light)' : 'transparent',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.875rem', color: diagnosis.repair_mode === 'screen_only' ? 'var(--primary)' : 'inherit' }}>
            <Smartphone size={18} /> {t('Somente troca de tela')}
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {t('Todo problema de tela recebe orçamento de troca de tela completa.')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSave({ repair_mode: 'screen_and_glass' })}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 16,
            borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
            border: diagnosis.repair_mode === 'screen_and_glass' ? '2px solid var(--primary)' : '1px solid var(--border)',
            background: diagnosis.repair_mode === 'screen_and_glass' ? 'var(--primary-light)' : 'transparent',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.875rem', color: diagnosis.repair_mode === 'screen_and_glass' ? 'var(--primary)' : 'inherit' }}>
            <Layers size={18} /> {t('Troca de tela e de vidro')}
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {t('Quando o caso se qualificar, o orçamento é de troca de vidro, mais barato para o cliente.')}
          </span>
        </button>
      </div>

      {diagnosis.repair_mode === 'screen_and_glass' && (
        <div className="form-group">
          <label className="form-label">{t('Condições que qualificam para troca de vidro')}</label>
          <textarea
            className="input" rows={4} style={{ resize: 'vertical', fontFamily: 'inherit' }}
            defaultValue={diagnosis.glass_rules ?? ''}
            placeholder={t('Ex: toque funcionando normalmente, imagem perfeita e apenas o vidro trincado...')}
            onBlur={e => { if (e.target.value !== diagnosis.glass_rules) onSave({ glass_rules: e.target.value }); }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {t('O agente usa estas condições para decidir entre troca de vidro e troca de tela antes de orçar.')}
          </p>
        </div>
      )}

      {(saving || saved) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: saved ? '#16a34a' : 'var(--text-muted)' }}>
          {saved ? <><Check size={14} /> {t('Configurações salvas!')}</> : t('Salvando...')}
        </div>
      )}
    </div>
  );
};

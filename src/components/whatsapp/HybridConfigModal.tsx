import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { HybridMode } from '@/types';

interface HybridConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: HybridMode;
  currentPercentage: number;
  onSave: (mode: HybridMode, percentage: number) => Promise<void>;
}

export function HybridConfigModal({
  isOpen,
  onClose,
  currentMode,
  currentPercentage,
  onSave,
}: HybridConfigModalProps) {
  const [mode, setMode] = useState<HybridMode>(currentMode);
  const [percentage, setPercentage] = useState(currentPercentage);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(mode, percentage);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar config hibrida:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 className="modal-title">Modo Hibrido</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: '0.875rem' }}>
            Configure como as mensagens serao roteadas entre a API Oficial e a API Alternativa.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${mode === 'integral' ? 'var(--primary)' : 'var(--border)'}`,
                background: mode === 'integral' ? 'var(--primary-light)' : 'transparent',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              <input
                type="radio"
                name="hybrid-mode"
                value="integral"
                checked={mode === 'integral'}
                onChange={() => setMode('integral')}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Integral</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  100% API Oficial
                </div>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${mode === 'partial' ? 'var(--primary)' : 'var(--border)'}`,
                background: mode === 'partial' ? 'var(--primary-light)' : 'transparent',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              <input
                type="radio"
                name="hybrid-mode"
                value="partial"
                checked={mode === 'partial'}
                onChange={() => setMode('partial')}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Parcial</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  1a resposta via API Oficial, resto via API Alternativa
                </div>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${mode === 'random' ? 'var(--primary)' : 'var(--border)'}`,
                background: mode === 'random' ? 'var(--primary-light)' : 'transparent',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              <input
                type="radio"
                name="hybrid-mode"
                value="random"
                checked={mode === 'random'}
                onChange={() => setMode('random')}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Aleatorio</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Decide por conversa baseado na porcentagem
                </div>
              </div>
            </label>
          </div>

          {mode === 'random' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>
                  % via API Oficial
                </label>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {percentage}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={percentage}
                onChange={(e) => setPercentage(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>0% (só Alternativa)</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>100% (só Oficial)</span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : null}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

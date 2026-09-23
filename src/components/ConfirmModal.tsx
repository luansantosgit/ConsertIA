import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
  checkboxLabel,
  checkboxChecked = false,
  onCheckboxChange,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: { bg: '#fef2f2', color: 'var(--danger)', icon: Trash2 },
    warning: { bg: '#fffbeb', color: 'var(--warning)', icon: AlertTriangle },
    info: { bg: 'var(--primary-light)', color: 'var(--primary)', icon: AlertTriangle },
  };

  const style = variantStyles[variant];
  const Icon = style.icon;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 400 }}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              borderRadius: 'var(--radius-md)',
              background: style.bg,
              marginBottom: 16,
            }}
          >
            <Icon size={20} style={{ color: style.color, flexShrink: 0 }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {message}
            </p>
          </div>
        </div>

        {checkboxLabel && (
          <div style={{ padding: '0 20px 12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={checkboxChecked}
                onChange={e => onCheckboxChange?.(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: 'var(--primary)' }}
              />
              {checkboxLabel}
            </label>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className="btn"
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: variant === 'danger' ? 'var(--danger)' : variant === 'warning' ? 'var(--warning)' : 'var(--primary)',
              color: '#fff',
              border: 'none',
              gap: 6,
            }}
          >
            {loading && (
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                  display: 'inline-block',
                }}
              />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

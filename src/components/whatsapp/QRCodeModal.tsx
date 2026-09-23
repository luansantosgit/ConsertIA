import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Loader2 } from 'lucide-react';
import { checkConnectionStatus, configureWebhook } from '@/lib/api-alternativa.service';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode?: string | null;
  title: string;
  subtitle?: string;
  expiresIn?: number;
  onRefresh?: () => void;
  loading?: boolean;
  error?: string | null;
  connectionId?: string | null;
  onConnected?: () => void;
}

export function QRCodeModal({
  isOpen,
  onClose,
  qrCode,
  title,
  subtitle,
  expiresIn = 45,
  onRefresh,
  loading = false,
  error,
  connectionId,
  onConnected,
}: QRCodeModalProps) {
  const [timeLeft, setTimeLeft] = useState(expiresIn);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setTimeLeft(expiresIn);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, expiresIn, qrCode]);

  useEffect(() => {
    if (!isOpen || !connectionId || !onConnected) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const result = await checkConnectionStatus(connectionId);
        if (result.connected) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          await configureWebhook(connectionId);
          onConnected();
        }
      } catch (e) {
        console.error('[QR Polling] error:', e);
      }
    }, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isOpen, connectionId, onConnected]);

  if (!isOpen) return null;

  const progress = expiresIn > 0 ? (timeLeft / expiresIn) * 100 : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ alignItems: 'center', padding: '24px' }}>
          {subtitle && (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.875rem' }}>
              {subtitle}
            </p>
          )}

          <div
            style={{
              width: 240,
              height: 240,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              marginBottom: 16,
            }}
          >
            {loading ? (
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
            ) : qrCode ? (
              <img src={qrCode} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
            ) : error ? (
              <span style={{ color: 'var(--danger)', fontSize: '0.8125rem', textAlign: 'center', padding: 12 }}>{error}</span>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>QR Code indisponivel</span>
            )}
          </div>

          <div style={{ width: '100%', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Expira em
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {timeLeft}s
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${progress}%`,
                  backgroundColor: progress < 30 ? 'var(--danger)' : 'var(--primary)',
                }}
              />
            </div>
          </div>

          {onRefresh && (
            <button
              className="btn btn-secondary"
              onClick={onRefresh}
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <RefreshCw size={14} />
              )}
              Atualizar QR
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

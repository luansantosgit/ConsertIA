import React, { useState, useEffect } from 'react';
import { X, Printer, Send, FileText, Wrench } from 'lucide-react';
import type { OSRow } from '@/components/OSModal';
import { useThemeStore } from '@/stores/theme.store';
import { supabase } from '@/lib/supabase';
import { formatOSCode, formatCurrency } from '@/lib/format';
import { osDocLabels, osStatusLabel, osPriorityLabel } from '@/components/osDocumentLabels';
import type { OSDocLabels } from '@/components/osDocumentLabels';

interface OSDocumentModalProps {
  os: OSRow;
  customerPhone?: string;
  onClose: () => void;
  onSendToChat?: (os: OSRow) => void;
}

interface CompanySettings {
  company_name?: string | null;
  cnpj?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  address?: string | null;
  language?: string | null;
  os_terms?: string | null;
}

export const OSDocumentModal: React.FC<OSDocumentModalProps> = ({
  os,
  customerPhone,
  onClose,
  onSendToChat,
}) => {
  const { activeTheme } = useThemeStore();
  const [company, setCompany] = useState<CompanySettings>({});

  useEffect(() => {
    supabase
      .from('tenant_settings')
      .select('company_name, cnpj, whatsapp, phone, address, language, os_terms')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data) setCompany(data as CompanySettings); });
  }, []);

  const labels: OSDocLabels = osDocLabels(company.language ?? undefined);
  const locale = company.language === 'en' ? 'en-US' : company.language === 'es' ? 'es-ES' : 'pt-BR';

  const budget = os.budget_amount || 0;
  const hasPart = Boolean(os.part_name || (os.part_amount && os.part_amount > 0));
  const hasLabor = Boolean(os.labor_amount && os.labor_amount > 0);

  const handlePrint = () => window.print();
  const handleSend = () => { if (onSendToChat) onSendToChat(os); };

  const cell = { padding: '10px 12px' } as const;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal"
        style={{ maxWidth: 840, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header print-hide" style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--primary-light)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1rem' }}>{labels.title} {formatOSCode(os.id)}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{labels.subtitle}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint} style={{ gap: 6 }}>
              <Printer size={14} /> {labels.print}
            </button>
            {onSendToChat && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSend}
                style={{ gap: 6, background: '#10b981', borderColor: '#059669' }}
              >
                <Send size={14} /> {labels.sendChat}
              </button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div
          id="printable-os-document"
          style={{
            flex: 1, overflowY: 'auto', padding: '36px 40px',
            background: '#ffffff', color: '#1e293b',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 10,
                background: activeTheme.primaryColor || '#4f46e5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '1.25rem'
              }}>
                {activeTheme.logoUrl ? (
                  <img src={activeTheme.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <Wrench size={24} />
                )}
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  {company.company_name || activeTheme.logoText || 'DeeperIA'}
                </h2>
                {(company.cnpj || company.whatsapp || company.phone) && (
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    {company.cnpj && <>CNPJ: {company.cnpj}</>}
                    {company.cnpj && (company.whatsapp || company.phone) && <> · </>}
                    {(company.whatsapp || company.phone) && <>Tel/WhatsApp: {company.whatsapp || company.phone}</>}
                  </p>
                )}
                {company.address && (
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '1px 0 0 0' }}>
                    {company.address}
                  </p>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                display: 'inline-block',
                background: '#f1f5f9',
                padding: '6px 14px',
                borderRadius: 8,
                fontWeight: 800,
                fontSize: '1.125rem',
                color: activeTheme.primaryColor || '#4f46e5'
              }}>
                {formatOSCode(os.id)}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '6px 0 0 0' }}>
                {labels.emissionDate}: {new Date(os.created_at || Date.now()).toLocaleDateString(locale)}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                {labels.status}: <strong>{osStatusLabel(company.language ?? undefined, os.status)}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                {labels.customerData}
              </p>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 4px 0' }}>{os.customerName}</p>
              {customerPhone && (
                <p style={{ fontSize: '0.8125rem', color: '#475569', margin: '0 0 2px 0' }}>
                  {labels.phone}: {customerPhone}
                </p>
              )}
              <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0 }}>
                {labels.customerId}: #{os.customer_id || '1'}
              </p>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                {labels.deviceData}
              </p>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 4px 0' }}>{os.equipmentLabel}</p>
              <p style={{ fontSize: '0.8125rem', color: '#475569', margin: '0 0 2px 0' }}>
                {labels.technician}: {os.technicianName || '—'}
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0 }}>
                {labels.priority}: <strong>{osPriorityLabel(company.language ?? undefined, os.priority)}</strong>
              </p>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
              {labels.problemReported}
            </p>
            <div style={{ padding: '14px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8 }}>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', margin: '0 0 6px 0', color: '#0f172a' }}>
                {os.subject}
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                {os.description || labels.defaultDescription}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
              {labels.breakdownTitle}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ ...cell, color: '#334155' }}>{labels.item}</th>
                  <th style={{ ...cell, color: '#334155', width: 80, textAlign: 'center' }}>{labels.qty}</th>
                  <th style={{ ...cell, color: '#334155', width: 140, textAlign: 'right' }}>{labels.value}</th>
                </tr>
              </thead>
              <tbody>
                {hasPart && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={cell}>
                      <strong>{labels.partRow}</strong>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>{os.part_name || labels.partFallback}</p>
                    </td>
                    <td style={{ ...cell, textAlign: 'center' }}>1</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{os.part_amount ? formatCurrency(os.part_amount) : labels.toDefine}</td>
                  </tr>
                )}
                {hasLabor && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={cell}>
                      <strong>{labels.laborRow}</strong>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>{labels.laborDesc}</p>
                    </td>
                    <td style={{ ...cell, textAlign: 'center' }}>1</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{formatCurrency(os.labor_amount!)}</td>
                  </tr>
                )}
                {!hasPart && !hasLabor && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={cell}>
                      <strong>{labels.serviceRow}</strong>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>{os.subject}</p>
                    </td>
                    <td style={{ ...cell, textAlign: 'center' }}>1</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{budget > 0 ? formatCurrency(budget) : labels.toDefine}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc' }}>
                  <td colSpan={2} style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontSize: '1rem' }}>
                    {labels.total}:
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, fontSize: '1.125rem', color: activeTheme.primaryColor || '#4f46e5' }}>
                    {budget > 0 ? formatCurrency(budget) : labels.toDefine}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 20, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 16px 0' }}>
              <strong>{labels.termsLabel}:</strong> {company.os_terms || labels.defaultTerms}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 36, paddingTop: 10 }}>
              <div style={{ textAlign: 'center', borderTop: '1px solid #94a3b8', paddingTop: 6 }}>
                {labels.customerSignature}
              </div>
              <div style={{ textAlign: 'center', borderTop: '1px solid #94a3b8', paddingTop: 6 }}>
                {company.company_name || activeTheme.logoText || 'DeeperIA'} — {labels.techSignature}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer print-hide" style={{ background: '#f8fafc', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {labels.readyFooter}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose}>{labels.close}</button>
            <button className="btn btn-primary" onClick={handlePrint} style={{ gap: 6 }}>
              <Printer size={15} /> {labels.print}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-os-document, #printable-os-document * {
            visibility: visible;
          }
          #printable-os-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm !important;
            margin: 0;
            background: #fff !important;
          }
          .print-hide {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

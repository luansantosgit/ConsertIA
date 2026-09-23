import React from 'react';
import { X, Printer, Send, FileText, Wrench } from 'lucide-react';
import type { OSRow } from '@/components/OSModal';
import { useThemeStore } from '@/stores/theme.store';
import { formatOSCode, formatCurrency } from '@/lib/format';

interface OSDocumentModalProps {
  os: OSRow;
  customerPhone?: string;
  onClose: () => void;
  onSendToChat?: (os: OSRow) => void;
}

export const OSDocumentModal: React.FC<OSDocumentModalProps> = ({
  os,
  customerPhone,
  onClose,
  onSendToChat,
}) => {
  const { activeTheme } = useThemeStore();

  const handlePrint = () => {
    window.print();
  };

  const handleSend = () => {
    if (onSendToChat) {
      onSendToChat(os);
    }
  };

  const budget = os.budget_amount || 0;
  const hasPart = Boolean(os.part_name || (os.part_amount && os.part_amount > 0));
  const hasLabor = Boolean(os.labor_amount && os.labor_amount > 0);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal"
        style={{ maxWidth: 840, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header com ações rápidas */}
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
              <h3 className="modal-title" style={{ fontSize: '1rem' }}>Ordem de Serviço & Orçamento {formatOSCode(os.id)}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Documento gerado para impressão e envio ao cliente</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint} style={{ gap: 6 }}>
              <Printer size={14} /> Imprimir / Salvar PDF
            </button>
            {onSendToChat && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSend}
                style={{ gap: 6, background: '#10b981', borderColor: '#059669' }}
              >
                <Send size={14} /> Enviar no Chat (1 Clique)
              </button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Corpo do Documento formatado estilo A4 / PDF */}
        <div
          id="printable-os-document"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '36px 40px',
            background: '#ffffff',
            color: '#1e293b',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          {/* Cabeçalho da Empresa */}
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
                  {activeTheme.logoText || 'ConsertIA Assistência Técnica'}
                </h2>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  CNPJ: 12.345.678/0001-90 · Tel/WhatsApp: (11) 99999-0000
                </p>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '1px 0 0 0' }}>
                  Av. Paulista, 1234 — São Paulo, SP
                </p>
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
                Data de Emissão: {new Date(os.created_at || Date.now()).toLocaleDateString('pt-BR')}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Status: <strong>{os.status.toUpperCase()}</strong>
              </p>
            </div>
          </div>

          {/* Dados do Cliente e Equipamento em 2 Colunas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                Dados do Cliente
              </p>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 4px 0' }}>{os.customerName}</p>
              {customerPhone && (
                <p style={{ fontSize: '0.8125rem', color: '#475569', margin: '0 0 2px 0' }}>
                  Telefone: {customerPhone}
                </p>
              )}
              <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0 }}>
                ID Cliente: #{os.customer_id || '1'}
              </p>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                Dados do Aparelho
              </p>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 4px 0' }}>{os.equipmentLabel}</p>
              <p style={{ fontSize: '0.8125rem', color: '#475569', margin: '0 0 2px 0' }}>
                Técnico Responsável: {os.technicianName || '—'}
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0 }}>
                Prioridade: <strong style={{ textTransform: 'capitalize' }}>{os.priority}</strong>
              </p>
            </div>
          </div>

          {/* Descrição do Problema e Diagnóstico */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
              Problema Declarado / Laudo de Entrada
            </p>
            <div style={{ padding: '14px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8 }}>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', margin: '0 0 6px 0', color: '#0f172a' }}>
                {os.subject}
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                {os.description || 'Equipamento recebido para triagem técnica e teste de bancada.'}
              </p>
            </div>
          </div>

          {/* Discriminação de Valores e Orçamento */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
              Discriminação dos Serviços e Peças
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', color: '#334155' }}>Item / Descrição</th>
                  <th style={{ padding: '10px 12px', color: '#334155', width: 80, textAlign: 'center' }}>Qtd</th>
                  <th style={{ padding: '10px 12px', color: '#334155', width: 140, textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {hasPart && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <strong>Peça / Componente</strong>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>{os.part_name || 'Conforme orçamento aprovado'}</p>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>1</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{os.part_amount ? formatCurrency(os.part_amount) : 'A definir'}</td>
                  </tr>
                )}
                {hasLabor && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <strong>Mão de Obra</strong>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>Serviço técnico executado</p>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>1</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCurrency(os.labor_amount!)}</td>
                  </tr>
                )}
                {!hasPart && !hasLabor && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <strong>Serviço & Peças</strong>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>{os.subject}</p>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>1</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{budget > 0 ? formatCurrency(budget) : 'A definir'}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc' }}>
                  <td colSpan={2} style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontSize: '1rem' }}>
                    Total do Orçamento:
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, fontSize: '1.125rem', color: activeTheme.primaryColor || '#4f46e5' }}>
                    {budget > 0 ? formatCurrency(budget) : 'A definir'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Termos de Garantia & Assinatura */}
          <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 20, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 16px 0' }}>
              <strong>Termos de Serviço:</strong> Garantia legal de 90 (noventa) dias sobre o serviço executado e peças substituídas conforme o Art. 26 do CDC. Equipamentos não retirados em até 90 dias após a conclusão estarão sujeitos a taxa de armazenagem.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 36, paddingTop: 10 }}>
              <div style={{ textAlign: 'center', borderTop: '1px solid #94a3b8', paddingTop: 6 }}>
                Assinatura do Cliente
              </div>
              <div style={{ textAlign: 'center', borderTop: '1px solid #94a3b8', paddingTop: 6 }}>
                {activeTheme.logoText || 'ConsertIA'} — Técnico Responsável
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé com ações */}
        <div className="modal-footer print-hide" style={{ background: '#f8fafc', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Documento pronto para envio ou impressão A4.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
            <button className="btn btn-primary" onClick={handlePrint} style={{ gap: 6 }}>
              <Printer size={15} /> Imprimir / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Regra CSS para impressão limpa sem a interface ao redor */}
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

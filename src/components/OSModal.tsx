import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, ArrowRight, Send, Eye } from 'lucide-react';
import type { ServiceOrder, ChecklistPhoto } from '@/types';
import { OSDocumentModal } from '@/components/OSDocumentModal';
import { PhotoChecklist } from '@/components/PhotoChecklist';
import { CurrencyInput } from '@/components/CurrencyInput';

export interface OSRow extends ServiceOrder {
  customerName: string;
  customerPhone?: string;
  conversationId?: string;
  contactAvatar?: string;
  equipmentLabel: string;
  technicianName: string;
}

interface OSModalProps {
  initialCustomerName?: string;
  initialEquipment?: string;
  initialCustomerId?: string;
  onClose: () => void;
  onSave: (os: OSRow, sendToChat?: boolean) => void;
  onPreviewPdf?: (os: OSRow) => void;
}

export const OSModal: React.FC<OSModalProps> = ({
  initialCustomerName = '',
  initialEquipment = '',
  initialCustomerId = '',
  onClose,
  onSave,
}) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerName: initialCustomerName,
    equipmentLabel: initialEquipment,
    subject: '',
    description: '',
    budget_amount: 0,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    technicianName: '',
  });

  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [tempOS, setTempOS] = useState<OSRow | null>(null);
  const [photos, setPhotos] = useState<ChecklistPhoto[]>([]);

  const s = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const buildOSObject = (): OSRow => {
    const id = tempOS?.id || `OS-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    return {
      id,
      tenant_id: '',
      customer_id: initialCustomerId || '',
      status: 'pending',
      subject: form.subject || 'Triagem Técnica',
      description: form.description,
      budget_amount: form.budget_amount > 0 ? form.budget_amount : undefined,
      priority: form.priority,
      checklist_photos: photos,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customerName: form.customerName || 'Cliente',
      equipmentLabel: form.equipmentLabel || 'Equipamento não especificado',
      technicianName: form.technicianName,
    };
  };

  const handleGeneratePdfClick = () => {
    if (!form.customerName || !form.subject) return;
    const os = buildOSObject();
    setTempOS(os);
    setPdfGenerated(true);
    setShowPdfPreview(true);
  };

  const handleSaveOS = (sendToChat: boolean = false) => {
    if (!form.customerName || !form.subject) return;
    const os = tempOS || buildOSObject();
    onSave(os, sendToChat);
    onClose();
  };

  const handleGoToAllOS = () => {
    onClose();
    navigate('/ordens');
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
        <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'var(--primary-light)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FileText size={18} />
              </div>
              <div>
                <h3 className="modal-title">Nova Ordem de Serviço</h3>
                {initialCustomerName && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Cliente: <strong>{initialCustomerName}</strong>
                  </p>
                )}
              </div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
          </div>

          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <input
                  className="input"
                  value={form.customerName}
                  onChange={e => s('customerName', e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Equipamento *</label>
                <input
                  className="input"
                  value={form.equipmentLabel}
                  onChange={e => s('equipmentLabel', e.target.value)}
                  placeholder="Ex: iPhone 14 Pro"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Problema relatado *</label>
                <input
                  className="input"
                  value={form.subject}
                  onChange={e => s('subject', e.target.value)}
                  placeholder="Ex: Substituição de display"
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Orçamento (R$)</label>
                <CurrencyInput
                  value={form.budget_amount}
                  onChange={v => s('budget_amount', v)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Descrição detalhada</label>
              <textarea
                className="textarea"
                rows={3}
                value={form.description}
                onChange={e => s('description', e.target.value)}
                placeholder="Descreva as condições de entrada e detalhes técnicos..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Prioridade</label>
                <select className="select" value={form.priority} onChange={e => s('priority', e.target.value)}>
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Técnico responsável</label>
                <input
                  className="input"
                  value={form.technicianName}
                  onChange={e => s('technicianName', e.target.value)}
                  placeholder="Nome do técnico"
                />
              </div>
            </div>

            {/* Checklist fotográfico */}
            <PhotoChecklist
              photos={photos}
              onChange={setPhotos}
              osId={tempOS?.id}
            />
          </div>

          {/* Rodapé organizado */}
          <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ color: 'var(--primary)', gap: 6, paddingLeft: 0 }}
              onClick={handleGoToAllOS}
            >
              Ver todas as OS <ArrowRight size={14} />
            </button>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>

              {!pdfGenerated ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleGeneratePdfClick}
                    style={{ gap: 6 }}
                    title="Gera o documento PDF da OS e do orçamento"
                  >
                    <FileText size={14} /> Gerar PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSaveOS(false)}
                    style={{ gap: 6 }}
                  >
                    <FileText size={14} /> Criar OS
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowPdfPreview(true)}
                    style={{ gap: 6 }}
                  >
                    <Eye size={14} /> Ver PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSaveOS(true)}
                    style={{ gap: 6, background: '#10b981', borderColor: '#059669' }}
                    title="Salva a OS e envia o PDF no chat do cliente"
                  >
                    <Send size={14} /> Enviar no Chat
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Pré-visualização do PDF gerado */}
      {showPdfPreview && tempOS && (
        <OSDocumentModal
          os={tempOS}
          customerPhone=""
          onClose={() => setShowPdfPreview(false)}
          onSendToChat={() => {
            setShowPdfPreview(false);
            handleSaveOS(true);
          }}
        />
      )}
    </>
  );
};

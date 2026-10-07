import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, ArrowRight, Send, Eye } from 'lucide-react';
import type { ServiceOrder, ChecklistPhoto } from '@/types';
import { OSDocumentModal } from '@/components/OSDocumentModal';
import { PhotoChecklist } from '@/components/PhotoChecklist';
import { BudgetItemsSection, type BudgetItem } from '@/components/BudgetItemsSection';

export interface OSRow extends ServiceOrder {
  customerName: string;
  customerPhone?: string;
  conversationId?: string;
  contactAvatar?: string;
  equipmentLabel: string;
  technicianName: string;
  serialNumber?: string;
}

interface OSModalProps {
  initialCustomerName?: string;
  initialEquipment?: string;
  initialCustomerId?: string;
  initialOs?: OSRow;
  onClose: () => void;
  onSave: (os: OSRow, sendToChat?: boolean) => void;
  onPreviewPdf?: (os: OSRow) => void;
}

export const OSModal: React.FC<OSModalProps> = ({
  initialCustomerName = '',
  initialEquipment = '',
  initialCustomerId = '',
  initialOs,
  onClose,
  onSave,
}) => {
  const navigate = useNavigate();
  const isEdit = !!initialOs;
  const [form, setForm] = useState({
    customerName: initialOs?.customerName ?? initialCustomerName,
    equipmentLabel: initialOs?.equipmentLabel ?? initialEquipment,
    subject: initialOs?.subject ?? '',
    description: initialOs?.description ?? '',
    priority: (initialOs?.priority ?? 'medium') as 'low' | 'medium' | 'high' | 'urgent',
    technicianName: initialOs?.technicianName ?? '',
    serialNumber: initialOs?.serialNumber ?? '',
  });
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(
    (initialOs?.budget_items as BudgetItem[]) ??
    (initialOs?.budget_amount
      ? [{ name: initialOs.subject || 'Serviço', value: initialOs.budget_amount }]
      : []),
  );

  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [tempOS, setTempOS] = useState<OSRow | null>(null);
  const [photos, setPhotos] = useState<ChecklistPhoto[]>(initialOs?.checklist_photos ?? []);

  const s = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const [draftOsId, setDraftOsId] = useState<string | null>(null);

  const handleShareChecklist = async (): Promise<string> => {
    if (draftOsId) {
      return `${window.location.origin}/checklist/${draftOsId}`;
    }
    // Salva rascunho da OS para obter ID real usado no link
    const { ServiceOrderRepository } = await import('@/repositories/service-order.repository');
    const repo = new ServiceOrderRepository();
    const total = budgetItems.reduce((a, i) => a + (Number(i.value) || 0), 0);
    const created = await repo.createFromForm({
      customerId: initialCustomerId || undefined,
      customerName: form.customerName || 'Cliente',
      subject: form.subject || 'OS em abertura',
      description: form.description || undefined,
      budgetAmount: total > 0 ? total : undefined,
      budgetItems,
      priority: form.priority,
      checklistPhotos: photos,
      serialNumber: form.serialNumber || undefined,
    });
    setDraftOsId(created.id);
    setTempOS(prev => (prev ? { ...prev, id: created.id } : prev));
    return `${window.location.origin}/checklist/${created.id}`;
  };

  const buildOSObject = (): OSRow => {
    const total = budgetItems.reduce((a, i) => a + (Number(i.value) || 0), 0);
    const validId = draftOsId ?? tempOS?.id;
    if (initialOs) {
      return {
        ...initialOs,
        subject: form.subject || initialOs.subject,
        description: form.description,
        budget_amount: total > 0 ? total : undefined,
        budget_items: budgetItems,
        priority: form.priority,
        checklist_photos: photos,
        customerName: form.customerName || 'Cliente',
        equipmentLabel: form.equipmentLabel || 'Equipamento não especificado',
        technicianName: form.technicianName,
        serialNumber: form.serialNumber || undefined,
        updated_at: new Date().toISOString(),
      };
    }
    const id = validId || `OS-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    return {
      id,
      tenant_id: '',
      customer_id: initialCustomerId || '',
      status: 'pending',
      subject: form.subject || 'Triagem Técnica',
      description: form.description,
      budget_amount: total > 0 ? total : undefined,
      budget_items: budgetItems,
      priority: form.priority,
      checklist_photos: photos,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customerName: form.customerName || 'Cliente',
      equipmentLabel: form.equipmentLabel || 'Equipamento não especificado',
      technicianName: form.technicianName,
      serialNumber: form.serialNumber || undefined,
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
                <h3 className="modal-title">{isEdit ? 'Alterar Ordem de Serviço' : 'Nova Ordem de Serviço'}</h3>
                {(initialCustomerName || initialOs?.customerName) && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Cliente: <strong>{initialOs?.customerName || initialCustomerName}</strong>
                  </p>
                )}
              </div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
          </div>

          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Equipamento *</label>
                <input
                  className="input"
                  value={form.equipmentLabel}
                  onChange={e => s('equipmentLabel', e.target.value)}
                  placeholder="Ex: iPhone 14 Pro"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nº de Série do Aparelho</label>
                <input
                  className="input"
                  value={form.serialNumber}
                  onChange={e => s('serialNumber', e.target.value)}
                  placeholder="Ex: F2LX9ABCDM (opcional)"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Problema relatado *</label>
              <input
                className="input"
                value={form.subject}
                onChange={e => s('subject', e.target.value)}
                placeholder="Ex: Tela trincada após queda"
              />
            </div>

            <BudgetItemsSection items={budgetItems} onChange={setBudgetItems} />

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
              osId={initialOs?.id ?? draftOsId ?? undefined}
              onShareChecklist={handleShareChecklist}
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
                    <FileText size={14} /> {isEdit ? 'Ver PDF' : 'Gerar PDF'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSaveOS(false)}
                    style={{ gap: 6 }}
                  >
                    <FileText size={14} /> {isEdit ? 'Salvar alterações' : 'Criar OS'}
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
                  {isEdit ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleSaveOS(true)}
                      style={{ gap: 6, background: '#10b981', borderColor: '#059669' }}
                      title="Salva as alterações, regenera o PDF (substituindo o antigo) e envia ao cliente no chat"
                    >
                      <Send size={14} /> Salvar e Reenviar PDF
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleSaveOS(true)}
                      style={{ gap: 6, background: '#10b981', borderColor: '#059669' }}
                      title="Salva a OS e envia o PDF no chat do cliente"
                    >
                      <Send size={14} /> Enviar no Chat
                    </button>
                  )}
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

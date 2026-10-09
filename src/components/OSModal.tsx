import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, ArrowRight, Send, Eye, Check } from 'lucide-react';
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
  onSave: (os: OSRow, sendToChat?: boolean) => OSRow | void | Promise<OSRow | void>;
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
    equipmentLabel: initialOs?.equipmentLabel ?? initialOs?.equipment_name ?? initialEquipment,
    subject: initialOs?.subject ?? '',
    description: initialOs?.description ?? '',
    priority: (initialOs?.priority ?? 'medium') as 'low' | 'medium' | 'high' | 'urgent',
    technicianName: initialOs?.technicianName ?? '',
    serialNumber: initialOs?.serialNumber ?? initialOs?.serial_number ?? '',
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

  const buildOSObject = (): OSRow => {
    const total = budgetItems.reduce((a, i) => a + (Number(i.value) || 0), 0);
    const validId = tempOS?.id;
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

  const [step, setStep] = useState<'form' | 'saved'>('form');
  const [savedOsId, setSavedOsId] = useState<string | null>(null);

  const handleSaveOS = async (sendToChat: boolean = false) => {
    if (!form.customerName || !form.subject) return;
    const os = tempOS || buildOSObject();
    const result = await onSave(os, sendToChat);
    // UUID real só existe após o banco criar a OS — onSave retorna a OS salva
    const realId = result?.id ?? (os.id.match(/^[0-9a-f]{8}-/i) ? os.id : null);
    setSavedOsId(realId);
    setStep('saved');
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
                <h3 className="modal-title">
                  {step === 'saved' ? 'OS salva com sucesso!' : isEdit ? 'Alterar Ordem de Serviço' : 'Nova Ordem de Serviço'}
                </h3>
                {(initialCustomerName || initialOs?.customerName) && step === 'form' && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Cliente: <strong>{initialOs?.customerName || initialCustomerName}</strong>
                  </p>
                )}
              </div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
          </div>

          <div className="modal-body">
            {step === 'saved' ? (
              /* ── STEP 2: OS salva — checklist com link real ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 16px', borderRadius: 10,
                  background: '#ecfdf5', border: '1px solid #bbf7d0',
                }}>
                  <Check size={20} color="#16a34a" />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#166534', margin: 0 }}>
                      {savedOsId ? `OS-${savedOsId.replace(/-/g, '').slice(0, 6).toUpperCase()} criada` : 'OS enviada'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      Agora você pode compartilhar o link do checklist ou anexar fotos.
                    </p>
                  </div>
                </div>

                <PhotoChecklist
                  photos={photos}
                  onChange={setPhotos}
                  osId={savedOsId ?? initialOs?.id ?? undefined}
                />

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={onClose}>
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
            <>
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

            {/* Checklist fotográfico: em edição aparece no form (OS já existe) */}
            {isEdit && (
              <PhotoChecklist
                photos={photos}
                onChange={setPhotos}
                osId={initialOs?.id}
              />
            )}
          </>
          )}
          </div>

          {/* Rodapé organizado */}
          {step === 'form' && (
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
          )}
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

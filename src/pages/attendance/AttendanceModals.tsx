import React from 'react';
import { OSModal } from '@/components/OSModal';
import { OSDocumentModal } from '@/components/OSDocumentModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ForwardModal } from './ForwardModal';
import { MediaSendModal } from './MediaSendModal';
import type { AttendanceModalsState } from './useAttendanceModals';

/** Todos os modais do módulo Atendimento — compartilhados entre desktop e mobile. */
export const AttendanceModals: React.FC<{ m: AttendanceModalsState }> = ({ m }) => {
  const {
    selected,
    conversations,
    showNewConvModal,
    setShowNewConvModal,
    newConvName,
    setNewConvName,
    newConvPhone,
    setNewConvPhone,
    creatingConversation,
    handleConfirmNewConversation,
    isOSModalOpen,
    setIsOSModalOpen,
    viewingPdfOS,
    setViewingPdfOS,
    handleSaveNewOS,
    handleSendOSCardToChat,
    handleSendMediaFiles,
    forwardingMessage,
    setForwardingMessage,
    handleForwardToTarget,
    handleDeleteConversation,
    confirmDeleteConv,
    setConfirmDeleteConv,
    confirmClaimAi,
    setConfirmClaimAi,
    dontShowAgain,
    setDontShowAgain,
    executeAiToggle,
    pendingFiles,
    setPendingFiles,
    pendingCaption,
    setPendingCaption,
  } = m;

  return (
    <>
      {showNewConvModal && (
        <div className="modal-overlay" onClick={() => setShowNewConvModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">Nova Conversa</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowNewConvModal(false)}><span style={{ fontSize: 16 }}>&times;</span></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nome do cliente *</label>
                <input
                  className="input"
                  placeholder="Ex: Joao Silva"
                  value={newConvName}
                  onChange={e => setNewConvName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp *</label>
                <input
                  className="input"
                  placeholder="5511999999999"
                  value={newConvPhone}
                  onChange={e => setNewConvPhone(e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Formato: codigo do pais + DDD + numero</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewConvModal(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmNewConversation}
                disabled={!newConvName.trim() || newConvPhone.replace(/\D/g, '').length < 10 || creatingConversation}
              >
                {creatingConversation ? 'Criando...' : 'Iniciar Conversa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isOSModalOpen && selected && (
        <OSModal
          initialCustomerName={selected.contactName}
          initialEquipment={selected.deviceInfo}
          initialCustomerId={selected.customer_id}
          onClose={() => setIsOSModalOpen(false)}
          onSave={handleSaveNewOS}
        />
      )}
      {viewingPdfOS && selected && (
        <OSDocumentModal
          os={viewingPdfOS}
          customerPhone={selected.contact_phone}
          onClose={() => setViewingPdfOS(null)}
          onSendToChat={handleSendOSCardToChat}
        />
      )}

      <MediaSendModal
        isOpen={pendingFiles !== null}
        files={pendingFiles || []}
        initialCaption={pendingCaption}
        onSend={(files, caption) => {
          handleSendMediaFiles(files, caption);
          setPendingFiles(null);
          setPendingCaption(undefined);
        }}
        onClose={() => { setPendingFiles(null); setPendingCaption(undefined); }}
      />

      <ForwardModal
        isOpen={forwardingMessage !== null}
        message={forwardingMessage}
        conversations={conversations}
        onForward={handleForwardToTarget}
        onClose={() => setForwardingMessage(null)}
      />

      <ConfirmModal
        isOpen={confirmDeleteConv.isOpen}
        onClose={() => setConfirmDeleteConv({ isOpen: false, convId: '', convName: '' })}
        onConfirm={() => {
          handleDeleteConversation(confirmDeleteConv.convId);
          setConfirmDeleteConv({ isOpen: false, convId: '', convName: '' });
        }}
        title="Excluir Conversa"
        message={`Tem certeza que deseja excluir a conversa com "${confirmDeleteConv.convName}"? Todo o historico de mensagens sera removido permanentemente.`}
        variant="danger"
      />

      <ConfirmModal
        isOpen={confirmClaimAi.isOpen}
        onClose={() => setConfirmClaimAi({ isOpen: false, convId: '', convName: '', aiState: undefined })}
        onConfirm={() => {
          const { convId, aiState } = confirmClaimAi;
          if (dontShowAgain) {
            window.localStorage.setItem('deeperia:skip-ai-takeover-modal', '1');
          }
          setConfirmClaimAi({ isOpen: false, convId: '', convName: '', aiState: undefined });
          executeAiToggle(convId, aiState);
        }}
        checkboxLabel="Não mostrar novamente"
        checkboxChecked={dontShowAgain}
        onCheckboxChange={setDontShowAgain}
        title={confirmClaimAi.aiState === 'attending' ? 'Assumir atendimento' : 'Devolver ao agente de IA'}
        message={confirmClaimAi.aiState === 'attending'
          ? `Você vai assumir a conversa com "${confirmClaimAi.convName}". O agente de IA vai avisar o cliente que um atendente humano entrará em contato e ficará pausado até a conversa ser encerrada.`
          : `Você vai devolver a conversa com "${confirmClaimAi.convName}" para o agente de IA, que volta a atender automaticamente a partir da próxima mensagem do cliente.`}
        confirmLabel={confirmClaimAi.aiState === 'attending' ? 'Assumir atendimento' : 'Devolver ao agente de IA'}
        variant="info"
      />
    </>
  );
};

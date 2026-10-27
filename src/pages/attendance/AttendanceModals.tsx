import React from 'react';
import { OSModal } from '@/components/OSModal';
import { OSDocumentModal } from '@/components/OSDocumentModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ForwardModal } from './ForwardModal';
import { MediaSendModal } from './MediaSendModal';
import { NewConversationModal } from './NewConversationModal';
import type { AttendanceModalsState } from './useAttendanceModals';

/** Todos os modais do módulo Atendimento — compartilhados entre desktop e mobile. */
export const AttendanceModals: React.FC<{ m: AttendanceModalsState }> = ({ m }) => {
  const {
    selected,
    conversations,
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
      {m.showNewConvModal && <NewConversationModal m={m} />}

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

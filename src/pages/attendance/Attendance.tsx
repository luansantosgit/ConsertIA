import React from 'react';
import { OSModal } from '@/components/OSModal';
import { OSDocumentModal } from '@/components/OSDocumentModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import ErrorMessage from '@/components/ErrorMessage';
import { useAttendance } from './useAttendance';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatArea } from './ChatArea';
import { ClientDetailsPanel } from './ClientDetailsPanel';
import { ForwardModal } from './ForwardModal';
import { MediaSendModal } from './MediaSendModal';

export const Attendance: React.FC = () => {
  const {
    conversations,
    selected,
    selectedId,
    currentMessages,
    currentClientOSList,
    filtered,
    hasMoreConversations,
    loadingMoreConversations,
    loadMoreConversations,
    inputText,
    search,
    chatFilter,
    sortBy,
    suggestionDismissed,
    isRightPanelOpen,
    isEditingClient,
    editForm,
    isOSModalOpen,
    viewingPdfOS,
    loadingConversations,
    loadingMessages,
    error,
    showNewConvModal,
    newConvName,
    newConvPhone,
    creatingConversation,
    setSearch,
    setChatFilter,
    setSortBy,
    setInputText,
    setSuggestionDismissed,
    setIsRightPanelOpen,
    setEditForm,
    setIsOSModalOpen,
    setViewingPdfOS,
    setShowNewConvModal,
    setNewConvName,
    setNewConvPhone,
    handleSelectConv,
    handleStartEditClient,
    handleSaveClient,
    handleSendMessage,
    handleSendOSCardToChat,
    handleSaveNewOS,
    handleConfirmNewConversation,
    handleDeleteConversation,
    handleMarkUnread,
    handleTogglePin,
    handleClaimAi,
    handleReactToMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleForwardMessage,
    handleMentionMessage,
    handleCancelQuote,
    handleForwardToTarget,
    handleSendMedia,
    handleSendMediaFiles,
    handleSendAudio,
    handleFetchMedia,
    quotedMessage,
    forwardingMessage,
    setForwardingMessage,
    setError,
    loadConversations,
  } = useAttendance();

  const [confirmDeleteConv, setConfirmDeleteConv] = React.useState<{ isOpen: boolean; convId: string; convName: string }>({
    isOpen: false, convId: '', convName: '',
  });
  const [pendingFiles, setPendingFiles] = React.useState<File[] | null>(null);
  const [confirmClaimAi, setConfirmClaimAi] = React.useState<{ isOpen: boolean; convId: string; convName: string }>({
    isOpen: false, convId: '', convName: '',
  });

  if (error) {
    return (
      <div className="page" style={{ padding: '24px 28px' }}>
        <ErrorMessage message={error} onRetry={() => { setError(null); loadConversations(); }} />
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: 0, gap: 0, height: 'calc(100vh - var(--header-height))', overflow: 'hidden' }}>
      <div style={{ display: 'flex', height: '100%', width: '100%', position: 'relative' }}>
        <ConversationSidebar
          conversations={conversations}
          filtered={filtered}
          selectedId={selectedId}
          search={search}
          chatFilter={chatFilter}
          sortBy={sortBy}
          loadingConversations={loadingConversations}
          hasMore={hasMoreConversations}
          loadingMore={loadingMoreConversations}
          onSearchChange={setSearch}
          onChatFilterChange={setChatFilter}
          onSortChange={setSortBy}
          onLoadMore={loadMoreConversations}
          onSelectConversation={handleSelectConv}
          onMarkUnread={handleMarkUnread}
          onTogglePin={handleTogglePin}
          onAiClick={conv => setConfirmClaimAi({ isOpen: true, convId: conv.id, convName: conv.contactName })}
        />
        <ChatArea
          selected={selected}
          currentMessages={currentMessages}
          currentClientOSList={currentClientOSList}
          inputText={inputText}
          quotedMessage={quotedMessage}
          suggestionDismissed={suggestionDismissed}
          isRightPanelOpen={isRightPanelOpen}
          loadingMessages={loadingMessages}
          onInputChange={setInputText}
          onSendMessage={handleSendMessage}
          onSendFile={handleSendMedia}
          onSendAudio={handleSendAudio}
          onFilesAdded={setPendingFiles}
          onCancelQuote={handleCancelQuote}
          onDismissSuggestion={() => setSuggestionDismissed(true)}
          onToggleRightPanel={() => setIsRightPanelOpen(v => !v)}
          onOpenOSModal={() => setIsOSModalOpen(true)}
          onViewPdfOS={setViewingPdfOS}
          onReact={handleReactToMessage}
          onMention={handleMentionMessage}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          onForward={handleForwardMessage}
          onFetchMedia={handleFetchMedia}
        />
        {isRightPanelOpen && selected && (
          <ClientDetailsPanel
            selected={selected}
            currentClientOSList={currentClientOSList}
            isEditingClient={isEditingClient}
            editForm={editForm}
            onStartEdit={handleStartEditClient}
            onSaveClient={handleSaveClient}
            onEditFormChange={setEditForm}
            onOpenOSModal={() => setIsOSModalOpen(true)}
            onViewPdfOS={setViewingPdfOS}
            onSendOSCardToChat={handleSendOSCardToChat}
            onSetInputText={setInputText}
            onClose={() => setIsRightPanelOpen(false)}
            onDelete={() => setConfirmDeleteConv({ isOpen: true, convId: selected.id, convName: selected.contactName })}
          />
        )}
      </div>

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
        onSend={(files, caption) => {
          handleSendMediaFiles(files, caption);
          setPendingFiles(null);
        }}
        onClose={() => setPendingFiles(null)}
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
        onClose={() => setConfirmClaimAi({ isOpen: false, convId: '', convName: '' })}
        onConfirm={async () => {
          try {
            await handleClaimAi(confirmClaimAi.convId);
          } catch {
            /* erro já logado no hook */
          }
          setConfirmClaimAi({ isOpen: false, convId: '', convName: '' });
        }}
        title="Assumir atendimento"
        message={`Você vai assumir a conversa com "${confirmClaimAi.convName}". O agente de IA vai avisar o cliente que um atendente humano entrará em contato e ficará pausado até a conversa ser encerrada.`}
        confirmLabel="Assumir atendimento"
        variant="info"
      />
    </div>
  );
};

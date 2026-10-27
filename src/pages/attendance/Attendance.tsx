import React from 'react';
import { useAttendanceModals } from './useAttendanceModals';
import ErrorMessage from '@/components/ErrorMessage';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatArea } from './ChatArea';
import { ClientDetailsPanel } from './ClientDetailsPanel';
import { AttendanceModals } from './AttendanceModals';
import { MobileLayout } from './mobile/MobileLayout';

export const Attendance: React.FC = () => {
  const m = useAttendanceModals();
  const isMobile = useIsMobile();

  if (m.error) {
    return (
      <div className="page" style={{ padding: '24px 28px' }}>
        <ErrorMessage message={m.error} onRetry={() => { m.setError(null); m.loadConversations(); }} />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="m-attendance">
        <MobileLayout m={m} />
        <AttendanceModals m={m} />
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: 0, gap: 0, height: 'calc(100vh - var(--header-height))', overflow: 'hidden' }}>
      <div style={{ display: 'flex', height: '100%', width: '100%', position: 'relative' }}>
        <ConversationSidebar
          conversations={m.conversations}
          filtered={m.filtered}
          selectedId={m.selectedId}
          search={m.search}
          chatFilter={m.chatFilter}
          sortBy={m.sortBy}
          loadingConversations={m.loadingConversations}
          hasMore={m.hasMoreConversations}
          loadingMore={m.loadingMoreConversations}
          onSearchChange={m.setSearch}
          onChatFilterChange={m.setChatFilter}
          onSortChange={m.setSortBy}
          onLoadMore={m.loadMoreConversations}
          onSelectConversation={m.handleSelectConv}
          onMarkUnread={m.handleMarkUnread}
          onTogglePin={m.handleTogglePin}
          onAiClick={m.handleAiIconClick}
        />
        <ChatArea
          selected={m.selected}
          currentMessages={m.currentMessages}
          currentClientOSList={m.currentClientOSList}
          agentName={m.agentName}
          inputText={m.inputText}
          quotedMessage={m.quotedMessage}
          suggestionDismissed={m.suggestionDismissed}
          isRightPanelOpen={m.isRightPanelOpen}
          loadingMessages={m.loadingMessages}
          onInputChange={m.setInputText}
          onSendMessage={m.handleSendMessage}
          onSendFile={m.handleSendMedia}
          onSendAudio={m.handleSendAudio}
          onFilesAdded={m.setPendingFiles}
          onCancelQuote={m.handleCancelQuote}
          onDismissSuggestion={() => m.setSuggestionDismissed(true)}
          onToggleRightPanel={() => m.setIsRightPanelOpen(v => !v)}
          onOpenOSModal={() => m.setIsOSModalOpen(true)}
          onViewPdfOS={m.setViewingPdfOS}
          onReact={m.handleReactToMessage}
          onMention={m.handleMentionMessage}
          onEdit={m.handleEditMessage}
          onDelete={m.handleDeleteMessage}
          onForward={m.handleForwardMessage}
          onFetchMedia={m.handleFetchMedia}
          quickReplies={m.quickReplies}
          onSendQuickReply={m.handleSendQuickReply}
          onSendOSCard={m.handleSendOSCardToChat}
          onAttachMedia={(files, caption) => {
            m.setPendingCaption(caption);
            m.setPendingFiles(files);
          }}
        />
        {m.isRightPanelOpen && m.selected && (
          <ClientDetailsPanel
            selected={m.selected}
            currentClientOSList={m.currentClientOSList}
            isEditingClient={m.isEditingClient}
            editForm={m.editForm}
            onStartEdit={m.handleStartEditClient}
            onSaveClient={m.handleSaveClient}
            onEditFormChange={m.setEditForm}
            onOpenOSModal={() => m.setIsOSModalOpen(true)}
            onViewPdfOS={m.setViewingPdfOS}
            onSendOSCardToChat={m.handleSendOSCardToChat}
            onSetInputText={m.setInputText}
            onClose={() => m.setIsRightPanelOpen(false)}
            onDelete={() => m.setConfirmDeleteConv({ isOpen: true, convId: m.selected!.id, convName: m.selected!.contactName })}
          />
        )}
      </div>
      <AttendanceModals m={m} />
    </div>
  );
};

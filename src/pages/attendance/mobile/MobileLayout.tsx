import React, { useCallback, useEffect, useState } from 'react';
import { ChatArea } from '../ChatArea';
import { MobileChatList } from './MobileChatList';
import { MobileClientSheet } from './MobileClientSheet';
import type { MobileLayoutConfig } from './types';

/**
 * Layout mobile estilo WhatsApp: telas empilhadas em tela cheia.
 * Tela 1 (lista) fica sempre montada por baixo — preserva o scroll —
 * e a Tela 2 (chat) desliza por cima ao abrir uma conversa.
 */
export const MobileLayout: React.FC<MobileLayoutConfig> = ({ m }) => {
  const { selected, setSelectedId, setIsRightPanelOpen } = m;
  const [closingChat, setClosingChat] = useState(false);

  const goBack = useCallback(() => {
    setIsRightPanelOpen(false);
    setClosingChat(true);
    // Aguarda a animação de saída (slide-out) antes de desmontar o chat
    window.setTimeout(() => {
      setSelectedId('');
      setClosingChat(false);
    }, 170);
  }, [setIsRightPanelOpen, setSelectedId]);

  // Botão voltar do celular (PWA standalone) fecha o chat antes de sair do app,
  // como em apps nativos de mensagem. O botão de UI dispara o mesmo fluxo.
  // Depende apenas do ID: reabrir a mesma conversa não empilha novo estado.
  useEffect(() => {
    if (!selected) return;
    window.history.pushState({ deeperiaChat: true }, '');
    const onPop = () => goBack();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, goBack]);

  const handleBack = () => window.history.back();

  return (
    <>
      {/* Durante o slide-out do chat a lista volta a ficar visível por baixo (padrão WhatsApp) */}
      <div className={`m-pane m-list-pane ${selected && !closingChat ? 'm-pane-hidden' : ''}`}>
        <MobileChatList m={m} />
      </div>

      {selected && (
        <div className={`m-pane m-chat-pane ${closingChat ? 'm-chat-pane-closing' : ''}`}>
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
            onBack={handleBack}
          />
        </div>
      )}

      <MobileClientSheet m={m} />
    </>
  );
};

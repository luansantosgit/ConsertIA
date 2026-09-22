import React, { useState } from 'react';
import { Zap, X, Reply, Paperclip } from 'lucide-react';
import type { OSRow } from '@/components/OSModal';
import type { ChatMessage, ConvRow } from './types';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ChatEmptyState } from './ChatEmptyState';

interface ChatAreaProps {
  selected: ConvRow | undefined;
  currentMessages: ChatMessage[];
  currentClientOSList: OSRow[];
  agentName?: string;
  inputText: string;
  quotedMessage: ChatMessage | null;
  suggestionDismissed: boolean;
  isRightPanelOpen: boolean;
  loadingMessages: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: (customText?: string) => void;
  onSendFile: (file: File) => void;
  onSendAudio: (blob: Blob) => void;
  onFilesAdded: (files: File[]) => void;
  onCancelQuote: () => void;
  onDismissSuggestion: () => void;
  onToggleRightPanel: () => void;
  onOpenOSModal: () => void;
  onViewPdfOS: (os: OSRow) => void;
  onReact: (messageId: string, emoji: string) => void;
  onMention: (message: ChatMessage) => void;
  onEdit: (messageId: string, newText: string) => void;
  onDelete: (messageId: string) => void;
  onForward: (message: ChatMessage) => void;
  onFetchMedia: (messageId: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  selected,
  currentMessages,
  currentClientOSList,
  agentName,
  inputText,
  quotedMessage,
  suggestionDismissed,
  isRightPanelOpen,
  loadingMessages,
  onInputChange,
  onSendMessage,
  onSendFile,
  onSendAudio,
  onFilesAdded,
  onCancelQuote,
  onDismissSuggestion,
  onToggleRightPanel,
  onOpenOSModal,
  onViewPdfOS,
  onReact,
  onMention,
  onEdit,
  onDelete,
  onForward,
  onFetchMedia,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const dragDepthRef = React.useRef(0);

  const extractFiles = (dt: DataTransfer | null): File[] =>
    dt ? Array.from(dt.files || []) : [];

  if (!selected) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        <ChatEmptyState />
      </div>
    );
  }

  return (
    <div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#fff', position: 'relative' }}
      onDragEnter={e => {
        e.preventDefault();
        dragDepthRef.current += 1;
        if (extractFiles(e.dataTransfer).length > 0 || Array.from(e.dataTransfer.types || []).includes('Files')) {
          setDragOver(true);
        }
      }}
      onDragOver={e => e.preventDefault()}
      onDragLeave={e => {
        e.preventDefault();
        dragDepthRef.current -= 1;
        if (dragDepthRef.current <= 0) {
          dragDepthRef.current = 0;
          setDragOver(false);
        }
      }}
      onDrop={e => {
        e.preventDefault();
        dragDepthRef.current = 0;
        setDragOver(false);
        const dropped = extractFiles(e.dataTransfer);
        if (dropped.length > 0) onFilesAdded(dropped);
      }}
    >
      <ChatHeader
        selected={selected}
        isRightPanelOpen={isRightPanelOpen}
        onOpenOSModal={onOpenOSModal}
        onToggleRightPanel={onToggleRightPanel}
      />

      {selected?.aiSuggestion && !suggestionDismissed && (
        <div style={{
          margin: '12px 20px 0',
          padding: '10px 14px',
          background: 'linear-gradient(135deg, #ede9fe, #fdf4ff)',
          border: '1px solid #ddd6fe',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <Zap size={16} color="#7c3aed" />
          <p style={{ fontSize: '0.8125rem', color: '#5b21b6', flex: 1 }}>
            <strong>IA Copilot:</strong> {selected.aiSuggestion}
          </p>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            onClick={onDismissSuggestion}
            title="Dispensar aviso"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <MessageList
        messages={currentMessages}
        currentClientOSList={currentClientOSList}
        agentName={agentName}
        loadingMessages={loadingMessages}
        selectedId={selected?.id || ''}
        contactAvatar={selected?.contactAvatar}
        onViewPdfOS={onViewPdfOS}
        onReact={onReact}
        onMention={onMention}
        onEdit={onEdit}
        onDelete={onDelete}
        onForward={onForward}
        onFetchMedia={onFetchMedia}
      />

      {quotedMessage && (
        <div style={{
          margin: '0 20px',
          padding: '8px 12px',
          background: '#f1f5f9',
          borderTop: '1px solid var(--border)',
          borderLeft: '3px solid var(--primary)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Reply size={14} color="var(--primary)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>
              {quotedMessage.from === 'customer' ? 'Cliente' : quotedMessage.from === 'bot' ? 'IA ConsertIA' : 'Você'}
            </p>
            <p style={{ fontSize: '0.6875rem', margin: 0, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {quotedMessage.text || 'Mensagem original'}
            </p>
          </div>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
            onClick={onCancelQuote}
            title="Cancelar menção"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <MessageInput
        inputText={inputText}
        disabled={!selected}
        onInputChange={onInputChange}
        onSendMessage={onSendMessage}
        onSendFile={onSendFile}
        onSendAudio={onSendAudio}
        onFilesAdded={onFilesAdded}
      />

      {dragOver && (
        <div
          style={{
            position: 'absolute',
            inset: 12,
            borderRadius: 14,
            border: '2px dashed var(--primary)',
            background: 'var(--primary-light)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            pointerEvents: 'none',
          }}
        >
          <Paperclip size={32} color="var(--primary)" />
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
            Solte para anexar
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
            Imagens, vídeos, áudios e documentos
          </p>
        </div>
      )}
    </div>
  );
};

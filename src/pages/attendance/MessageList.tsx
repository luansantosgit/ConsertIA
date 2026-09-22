import React, { useState, useRef, useEffect } from 'react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { SkeletonLine } from '@/components/Skeleton';
import type { OSRow } from '@/components/OSModal';
import type { ChatMessage } from './types';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: ChatMessage[];
  currentClientOSList: OSRow[];
  loadingMessages: boolean;
  selectedId: string;
  contactAvatar?: string;
  agentName?: string;
  onViewPdfOS: (os: OSRow) => void;
  onReact: (messageId: string, emoji: string) => void;
  onMention: (msg: ChatMessage) => void;
  onEdit: (messageId: string, newText: string) => void;
  onDelete: (messageId: string) => void;
  onForward: (msg: ChatMessage) => void;
  onFetchMedia: (messageId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentClientOSList,
  loadingMessages,
  selectedId,
  contactAvatar,
  agentName,
  onViewPdfOS,
  onReact,
  onMention,
  onEdit,
  onDelete,
  onForward,
  onFetchMedia,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isNearBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [selectedId, loadingMessages]);

  useEffect(() => {
    if (isNearBottom()) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quoteMap = new Map(messages.map(m => [m.id, m]));

  return (
    <div ref={listRef} style={{
      flex: 1,
      overflowY: 'auto',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      background: '#f8fafc'
    }}>
      {loadingMessages && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2, 3].map(i => (
            <SkeletonLine key={i} height={44} width={`${45 + (i % 3) * 10}%`} />
          ))}
        </div>
      )}
      {!loadingMessages && messages.length === 0 && selectedId && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Nenhuma mensagem nesta conversa. Envie a primeira mensagem 👋
        </div>
      )}
      {!loadingMessages && messages.map(msg => (
        <div key={msg.id} onMouseEnter={() => setHoveredId(msg.id)} onMouseLeave={() => setHoveredId(null)}>
          <MessageBubble
            msg={msg}
            hovered={hoveredId === msg.id}
            quoted={msg.replyTo ? quoteMap.get(msg.replyTo) : undefined}
            contactAvatar={contactAvatar}
            osList={currentClientOSList}
            agentName={agentName}
            onReact={onReact}
            onMention={onMention}
            onEdit={onEdit}
            onRequestDelete={setConfirmDeleteId}
            onForward={onForward}
            onViewPdfOS={onViewPdfOS}
            onFetchMedia={onFetchMedia}
          />
        </div>
      ))}

      <div ref={bottomRef} />

      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) onDelete(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        title="Apagar Mensagem"
        message="Tem certeza que deseja apagar esta mensagem? Ela sera removida tambem para o cliente."
        variant="danger"
      />
    </div>
  );
};

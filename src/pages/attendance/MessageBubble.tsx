import React, { useState } from 'react';
import { User, Bot } from 'lucide-react';
import type { OSRow } from '@/components/OSModal';
import type { ChatMessage, ChatMediaType } from './types';
import { mediaLabel } from './types';
import { MessageActions } from './MessageActions';
import { StatusCheck } from './StatusCheck';
import { MediaContent } from './MediaContent';
import { MessageOSCard } from './MessageOSCard';

interface MessageBubbleProps {
  msg: ChatMessage;
  hovered: boolean;
  quoted?: ChatMessage;
  contactAvatar?: string;
  osList: OSRow[];
  onReact: (messageId: string, emoji: string) => void;
  onMention: (msg: ChatMessage) => void;
  onEdit: (messageId: string, newText: string) => void;
  onRequestDelete: (messageId: string) => void;
  onForward: (msg: ChatMessage) => void;
  onViewPdfOS: (os: OSRow) => void;
  onFetchMedia: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  hovered,
  quoted,
  contactAvatar,
  osList,
  onReact,
  onMention,
  onEdit,
  onRequestDelete,
  onForward,
  onViewPdfOS,
  onFetchMedia,
}) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const isCustomer = msg.from === 'customer';
  const isMedia = !!msg.mediaType && msg.mediaType !== undefined;
  const showText = !msg.mediaType || (msg.text && msg.text !== mediaLabel(msg.mediaType as ChatMediaType));

  const startEdit = () => {
    setEditText(msg.text);
    setEditing(true);
  };

  const saveEdit = () => {
    if (editText.trim()) onEdit(msg.id, editText.trim());
    setEditing(false);
  };

  const actionsNode = (
    <MessageActions
      msg={msg}
      hovered={hovered}
      side={isCustomer ? 'right' : 'left'}
      onReact={onReact}
      onMention={onMention}
      onStartEdit={startEdit}
      onRequestDelete={onRequestDelete}
      onForward={onForward}
    />
  );

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isCustomer ? 'flex-start' : 'flex-end',
        gap: 8,
        alignItems: 'flex-end',
      }}
    >
      {isCustomer && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: contactAvatar ? 'transparent' : 'var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, overflow: 'hidden',
        }}>
          {contactAvatar ? (
            <img src={contactAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <User size={14} color="var(--text-muted)" />
          )}
        </div>
      )}

      {!isCustomer && actionsNode}

      <div style={{ maxWidth: '72%', position: 'relative' }}>
        {msg.reaction && (
          <div style={{
            position: 'absolute', bottom: -8,
            left: isCustomer ? 0 : 'auto',
            right: isCustomer ? 'auto' : 0,
            background: '#fff', border: '1px solid var(--border)',
            borderRadius: 99, padding: '1px 6px', fontSize: '0.75rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', zIndex: 1,
          }}>
            {msg.reaction}
          </div>
        )}
        <div style={{
          padding: '10px 14px',
          borderRadius: 14,
          borderBottomLeftRadius: isCustomer ? 4 : 14,
          borderBottomRightRadius: isCustomer ? 14 : 4,
          background: isCustomer ? '#fff' : msg.from === 'bot' ? '#ede9fe' : 'var(--primary)',
          color: msg.from === 'attendant' ? '#fff' : 'var(--text-primary)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: isCustomer ? '1px solid var(--border)' : 'none',
          opacity: msg.deleted ? 0.5 : 1,
        }}>
          {msg.from === 'bot' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Bot size={12} color="#7c3aed" />
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#7c3aed' }}>IA ConsertIA</span>
            </div>
          )}

          {quoted && !msg.deleted && (
            <div style={{
              borderLeft: `3px solid ${msg.from === 'attendant' ? 'rgba(255,255,255,0.6)' : 'var(--primary)'}`,
              background: msg.from === 'attendant' ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
              borderRadius: 6, padding: '4px 8px', marginBottom: 6,
            }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, margin: 0, opacity: 0.85 }}>
                {quoted.from === 'customer' ? 'Cliente' : 'Você'}
              </p>
              <p style={{ fontSize: '0.6875rem', margin: 0, opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                {quoted.text || 'Mensagem original'}
              </p>
            </div>
          )}

          {msg.deleted ? (
            <p style={{ fontSize: '0.8125rem', lineHeight: 1.5, fontStyle: 'italic', opacity: 0.6 }}>
              Mensagem apagada
            </p>
          ) : editing ? (
            <div>
              <input
                className="input"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
                autoFocus
                style={{ fontSize: '0.875rem', padding: '4px 8px', color: 'var(--text-primary)' }}
              />
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button onClick={saveEdit} style={{ fontSize: '0.75rem', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Salvar</button>
                <button onClick={() => setEditing(false)} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              {isMedia && <MediaContent msg={msg} onFetchMedia={onFetchMedia} />}
              {showText && (
                <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
                  {msg.text}
                  {msg.edited && <span style={{ fontSize: '0.6875rem', opacity: 0.6, marginLeft: 4 }}>(editada)</span>}
                </p>
              )}
            </>
          )}

          {msg.osCard && (
            <MessageOSCard
              osCard={msg.osCard}
              from={msg.from}
              osList={osList}
              onViewPdfOS={onViewPdfOS}
            />
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
            <p style={{ fontSize: '0.625rem', opacity: msg.from === 'attendant' ? 0.8 : 0.6 }}>
              {msg.time}
            </p>
            {msg.from === 'attendant' && <StatusCheck status={msg.status} />}
          </div>
        </div>
      </div>

      {isCustomer && actionsNode}
    </div>
  );
};

import React, { useRef, useState, useEffect } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { EmojiPicker } from './EmojiPicker';
import { VoiceRecorderBar } from './VoiceRecorderBar';
import { MessageQuickReplies } from './MessageQuickReplies';

interface MessageInputProps {
  inputText: string;
  disabled?: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: (customText?: string) => void;
  onSendFile: (file: File) => void;
  onSendAudio: (blob: Blob) => void;
  onFilesAdded: (files: File[]) => void;
}

/** Altura máxima do textarea: ~3 linhas — depois rola internamente (padrão WhatsApp) */
const TA_MAX_HEIGHT = 92;

export const MessageInput: React.FC<MessageInputProps> = ({
  inputText,
  disabled,
  onInputChange,
  onSendMessage,
  onSendFile,
  onSendAudio,
  onFilesAdded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const isMobile = useIsMobile();

  // Fecha o picker ao clicar fora (padrao WhatsApp Web)
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmoji]);

  /** Auto-expande até a 3ª linha; a partir daí o textarea rola sozinho */
  const autoSize = React.useCallback(() => {
    const el = textInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, TA_MAX_HEIGHT)}px`;
  }, []);

  // Texto injetado externamente (quick replies, ações de IA) também expande
  useEffect(() => {
    autoSize();
  }, [inputText, autoSize]);

  /** Insere o emoji na posicao atual do cursor, mantendo o foco no input */
  const insertEmoji = (emoji: string) => {
    const el = textInputRef.current;
    const start = el?.selectionStart ?? inputText.length;
    const end = el?.selectionEnd ?? inputText.length;
    const next = inputText.slice(0, start) + emoji + inputText.slice(end);
    onInputChange(next);
    const caret = start + emoji.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };

  const iconBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    borderRadius: '50%',
    color: showEmoji ? 'var(--primary-text)' : 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    transition: 'color 0.15s, background 0.15s',
  };

  return (
    <div style={{
      padding: '12px 20px',
      borderTop: '1px solid var(--border)',
      background: 'var(--card-bg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {!isRecording && <MessageQuickReplies onPick={onInputChange} />}

      {/* flex-end: botões acompanham a última linha quando o textarea expande */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', position: 'relative' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          hidden
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) onSendFile(file);
            e.target.value = '';
          }}
        />

        {isRecording ? null : (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              title="Enviar imagem, vídeo ou documento"
              aria-label="Enviar mídia"
              style={iconBtn}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <Paperclip size={18} />
            </button>

            <button
              onClick={() => setShowEmoji(v => !v)}
              disabled={disabled}
              title="Emojis"
              aria-label="Inserir emoji"
              style={iconBtn}
            >
              <Smile size={18} />
            </button>

            <textarea
              ref={textInputRef}
              className="input"
              rows={1}
              placeholder="Digite uma mensagem ou resposta..."
              value={inputText}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => {
                // Desktop: Enter envia, Shift+Enter quebra linha (padrão WhatsApp Web).
                // Mobile: Enter quebra linha — o envio é pelo botão.
                if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              onPaste={e => {
                const pastedFiles = Array.from(e.clipboardData.files || []);
                if (pastedFiles.length > 0) {
                  e.preventDefault();
                  onFilesAdded(pastedFiles);
                }
              }}
              style={{
                flex: 1,
                resize: 'none',
                minHeight: 40,
                maxHeight: TA_MAX_HEIGHT,
                overflowY: 'auto',
                lineHeight: 1.35,
                padding: '9px 14px',
                borderRadius: 'var(--radius-full)',
              }}
            />

            {inputText.trim() && (
              <button
                className="btn btn-primary"
                style={{ borderRadius: '50%', width: 40, height: 40, padding: 0, flexShrink: 0 }}
                onClick={() => onSendMessage()}
                title="Enviar mensagem"
              >
                <Send size={16} />
              </button>
            )}
          </>
        )}

        <VoiceRecorderBar
          hidden={!isRecording && !!inputText.trim()}
          disabled={disabled}
          onSendAudio={onSendAudio}
          onStateChange={setIsRecording}
        />

        {showEmoji && (
          <div ref={emojiRef}>
            <EmojiPicker onPick={insertEmoji} />
          </div>
        )}
      </div>
    </div>
  );
};

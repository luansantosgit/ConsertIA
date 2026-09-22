import React, { useRef, useState, useEffect } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { VoiceRecorderBar } from './VoiceRecorderBar';

interface MessageInputProps {
  inputText: string;
  disabled?: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: (customText?: string) => void;
  onSendFile: (file: File) => void;
  onSendAudio: (blob: Blob) => void;
  onFilesAdded: (files: File[]) => void;
}

const QUICK_REPLIES = [
  'Orçamento pronto ✓',
  'Aparelho em bancada',
  'Aguardando aprovação',
  'Pronto para retirada! 🎉'
];

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
  const textInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

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
    color: showEmoji ? 'var(--primary)' : 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    transition: 'color 0.15s, background 0.15s',
  };

  return (
    <div style={{
      padding: '12px 20px',
      borderTop: '1px solid var(--border)',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {!isRecording && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {QUICK_REPLIES.map(q => (
            <button
              key={q}
              onClick={() => onInputChange(q)}
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: 99,
                border: '1px solid var(--border)',
                background: '#f8fafc',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
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

            <input
              ref={textInputRef}
              className="input"
              style={{ flex: 1, borderRadius: 'var(--radius-full)' }}
              placeholder="Digite uma mensagem ou resposta..."
              value={inputText}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSendMessage(); }}
              onPaste={e => {
                const pastedFiles = Array.from(e.clipboardData.files || []);
                if (pastedFiles.length > 0) {
                  e.preventDefault();
                  onFilesAdded(pastedFiles);
                }
              }}
            />

            {inputText.trim() && (
              <button
                className="btn btn-primary"
                style={{ borderRadius: '50%', width: 40, height: 40, padding: 0 }}
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

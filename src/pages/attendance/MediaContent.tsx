import React, { useState, useEffect } from 'react';
import { AlertTriangle, Download, FileText, Loader2 } from 'lucide-react';
import type { ChatMessage, ChatMediaType } from './types';
import { mediaLabel } from './types';

interface MediaContentProps {
  msg: ChatMessage;
  onFetchMedia: (messageId: string) => void;
}

export const MediaContent: React.FC<MediaContentProps> = ({ msg, onFetchMedia }) => {
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!msg.mediaUrl && msg.waMessageId && msg.from === 'customer' && !fetching) {
      setFetching(true);
      onFetchMedia(msg.id);
    }
  }, [msg.mediaUrl, msg.waMessageId, msg.from, msg.id, onFetchMedia, fetching]);

  const handleManualFetch = () => {
    setFetching(true);
    onFetchMedia(msg.id);
  };

  if (!msg.mediaUrl) {
    // Mídia que falhou no envio: não oferece "Baixar mídia" (não há nada
    // para baixar). O motivo detalhado aparece no texto da mensagem.
    if (msg.status === 'error' && msg.from === 'attendant') {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 10,
            padding: '10px 14px',
            maxWidth: 260,
          }}
        >
          <AlertTriangle size={18} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Falha ao enviar mídia</span>
            <span style={{ fontSize: '0.6875rem', opacity: 0.8 }}>Veja o motivo abaixo</span>
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: msg.from === 'attendant' ? 'rgba(255,255,255,0.15)' : 'var(--hover-bg)',
          border: msg.from === 'attendant' ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 14px',
          maxWidth: 260,
        }}
      >
        {fetching ? (
          <>
            <Loader2 size={18} className="animate-spin text-primary" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Carregando mídia...</span>
              <span style={{ fontSize: '0.6875rem', opacity: 0.7 }}>Baixando do WhatsApp</span>
            </div>
          </>
        ) : (
          <button
            onClick={handleManualFetch}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: msg.from === 'attendant' ? '#fff' : 'var(--primary)',
            }}
          >
            <Download size={16} />
            Baixar mídia
          </button>
        )}
      </div>
    );
  }

  const captionMargin = msg.text && msg.text !== mediaLabel(msg.mediaType as ChatMediaType) ? 6 : 0;

  switch (msg.mediaType) {
    case 'image':
      return (
        <a
          href={msg.mediaUrl}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'block', textDecoration: 'none' }}
        >
          <img
            src={msg.mediaUrl}
            alt={msg.text || 'Imagem'}
            loading="lazy"
            style={{
              maxWidth: 280,
              width: '100%',
              borderRadius: 10,
              display: 'block',
              marginBottom: captionMargin,
              objectFit: 'cover',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              transition: 'transform 0.15s ease',
            }}
            onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.01)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
          />
        </a>
      );

    case 'video':
      return (
        <video
          src={msg.mediaUrl}
          controls
          preload="metadata"
          style={{
            maxWidth: 280,
            width: '100%',
            borderRadius: 10,
            display: 'block',
            marginBottom: captionMargin,
          }}
        />
      );

    case 'audio':
    case 'ptt':
      return (
        <audio
          src={msg.mediaUrl}
          controls
          preload="metadata"
          style={{
            width: 240,
            display: 'block',
            marginBottom: captionMargin,
          }}
        />
      );

    case 'sticker':
      return (
        <img
          src={msg.mediaUrl}
          alt="figurinha"
          style={{ maxWidth: 160, borderRadius: 10, display: 'block' }}
        />
      );

    case 'document':
      return (
        <a
          href={msg.mediaUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            background: msg.from === 'attendant' ? 'rgba(255,255,255,0.12)' : 'var(--hover-bg)',
            borderRadius: 10,
            padding: '10px 14px',
            color: msg.from === 'attendant' ? '#fff' : 'var(--text-secondary)',
          }}
        >
          <FileText size={20} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Abrir documento</span>
        </a>
      );

    default:
      return null;
  }
};

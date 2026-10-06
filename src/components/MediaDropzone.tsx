import React, { useRef, useState } from 'react';
import { UploadCloud, Trash2, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';

// Componente reutilizável de upload de mídia com drag & drop.
// Mostra preview quando já tem mídia; área de arrastar quando não tem.
// Faz upload para o bucket do tenant e retorna a URL pública.
export const MediaDropzone: React.FC<{
  value: string | null;
  onChange: (url: string | null) => void;
  bucket?: string;
  label?: string;
  compact?: boolean;
}> = ({ value, onChange, bucket = 'quick-replies', label = 'Mídia', compact = false }) => {
  const tenantId = useAuthStore.getState().user?.tenantId ?? '';
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/') && !file.name.endsWith('.pdf')) {
      setError('Envie uma imagem, vídeo, áudio ou PDF.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Arquivo muito grande. Limite: 50MB.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const path = `${tenantId}/media-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch {
      setError('Erro no upload. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const ext = value?.split('.').pop()?.split('?')[0]?.toLowerCase() ?? '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  const isVideo = ['mp4', 'webm', 'mov', 'ogg'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext);
  const fileName = value ? decodeURIComponent(value.split('/').pop()?.split('?')[0] ?? '') : '';

  const height = compact ? 100 : 140;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="form-label">{label}</label>

      {value ? (
        <div style={{
          border: '1px solid var(--border)', borderRadius: 10,
          padding: 8, display: 'flex', flexDirection: 'column', gap: 8,
          alignItems: 'center',
        }}>
          {isImage && (
            <img src={value} alt={fileName} style={{ maxWidth: '100%', maxHeight: height, borderRadius: 8, objectFit: 'cover' }} />
          )}
          {isVideo && (
            <video src={value} controls style={{ maxWidth: '100%', maxHeight: height, borderRadius: 8 }} />
          )}
          {isAudio && (
            <audio src={value} controls style={{ width: '100%' }} />
          )}
          {!isImage && !isVideo && !isAudio && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', padding: 12 }}>
              <FileText size={18} color="var(--primary)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{fileName}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{ gap: 4, fontSize: '0.6875rem' }}
            >
              <UploadCloud size={11} /> Trocar
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onChange(null)}
              disabled={uploading}
              style={{ color: 'var(--danger)', gap: 4, fontSize: '0.6875rem' }}
            >
              <Trash2 size={11} /> Remover
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) upload(file);
          }}
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: compact ? '12px 10px' : '18px 14px',
            borderRadius: 10,
            cursor: uploading ? 'wait' : 'pointer',
            border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
            background: dragOver ? 'var(--primary-light)' : 'transparent',
            transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          <UploadCloud size={compact ? 18 : 22} color="var(--primary)" style={uploading ? { animation: 'spin 1s linear infinite' } : undefined} />
          <span style={{ fontSize: compact ? '0.6875rem' : '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {uploading ? 'Enviando...' : 'Arraste a mídia aqui'}
          </span>
          {!compact && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              ou clique para escolher · imagem, vídeo, áudio, PDF
            </span>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.6875rem', margin: 0 }}>{error}</p>}
    </div>
  );
};

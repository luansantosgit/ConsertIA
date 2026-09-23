import React, { useRef, useState } from 'react';
import { Camera, X, Upload, Link2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import type { ChecklistPhoto } from '@/types';

interface PhotoChecklistProps {
  photos: ChecklistPhoto[];
  onChange: (photos: ChecklistPhoto[]) => void;
  osId?: string;
}

export const PhotoChecklist: React.FC<PhotoChecklistProps> = ({
  photos,
  onChange,
  osId,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAuthStore();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    const uploaded: ChecklistPhoto[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) continue;

      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user?.tenantId || 'global'}/${osId || 'temp'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error } = await supabase.storage
        .from('os-photos')
        .upload(path, file, { contentType: file.type });

      if (!error) {
        const { data } = supabase.storage.from('os-photos').getPublicUrl(path);
        uploaded.push({
          url: data.publicUrl,
          label: '',
          uploadedAt: new Date().toISOString(),
        });
      }
    }

    onChange([...photos, ...uploaded]);
    setUploading(false);
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  const updateLabel = (index: number, label: string) => {
    const updated = [...photos];
    updated[index] = { ...updated[index], label };
    onChange(updated);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/checklist/${osId || 'new'}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          padding: '12px 14px',
          background: '#f8fafc',
          borderRadius: 'var(--radius-md)',
          border: '2px dashed var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: uploading ? 'wait' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          width: '100%',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)';
          e.currentTarget.style.background = 'var(--primary-light)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.background = '#f8fafc';
        }}
      >
        <Camera size={20} color="var(--text-muted)" />
        <div>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {uploading ? 'Enviando fotos...' : 'Checklist fotográfico de entrada'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {uploading ? 'Aguarde' : 'Toque para abrir a câmera e fotos do aparelho'}
          </p>
        </div>
        {uploading && (
          <Upload size={16} color="var(--primary)" style={{ marginLeft: 'auto', animation: 'spin 1s linear infinite' }} />
        )}
      </button>

      <button
        type="button"
        onClick={copyLink}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          color: copied ? 'var(--success)' : 'var(--text-muted)',
          cursor: 'pointer',
          width: 'fit-content',
        }}
      >
        {copied ? <Check size={13} /> : <Link2 size={13} />}
        {copied ? 'Link copiado!' : 'Copiar link do checklist'}
      </button>

      {photos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {photos.map((photo, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                width: 80,
                height: 80,
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                border: '1px solid var(--border)',
              }}
            >
              <img
                src={photo.url}
                alt={photo.label || `Foto ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={12} />
              </button>
              <input
                type="text"
                placeholder="Legenda"
                value={photo.label}
                onChange={(e) => updateLabel(i, e.target.value)}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '2px 4px',
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '0.625rem',
                  outline: 'none',
                }}
              />
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
    </div>
  );
};

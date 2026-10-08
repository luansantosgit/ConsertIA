import React, { useRef, useState } from 'react';
import { Camera, X, Upload, Link2, Check, Maximize2 } from 'lucide-react';
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
  const [preview, setPreview] = useState<ChecklistPhoto | null>(null);
  const { user } = useAuthStore();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: ChecklistPhoto[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) continue;
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user?.tenantId || 'global'}/${osId || 'temp'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('os-photos').upload(path, file, { contentType: file.type });
      if (!error) {
        const { data } = supabase.storage.from('os-photos').getPublicUrl(path);
        uploaded.push({ url: data.publicUrl, label: '', uploadedAt: new Date().toISOString() });
      }
    }
    onChange([...photos, ...uploaded]);
    setUploading(false);
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
    setPreview(null);
  };

  const updateLabel = (index: number, label: string) => {
    const updated = [...photos];
    updated[index] = { ...updated[index], label };
    onChange(updated);
  };

  const copyLink = () => {
    if (!osId) return;
    const shortCode = osId.replace(/-/g, '').slice(0, 6).toUpperCase();
    const url = `${window.location.origin}/checklist/${shortCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Fotos em destaque — grid grande */}
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {photos.map((photo, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
              }}
              onClick={() => setPreview(photo)}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              <img
                src={photo.url}
                alt={photo.label || `Foto ${i + 1}`}
                style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
              />
              {/* Badge de expandir */}
              <div style={{
                position: 'absolute', top: 6, left: 6,
                padding: '3px 6px', borderRadius: 6,
                background: 'rgba(0,0,0,0.5)', color: '#fff',
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: '0.5625rem', fontWeight: 600,
                pointerEvents: 'none', opacity: 0.7,
              }}>
                <Maximize2 size={10} /> {i + 1}
              </div>
              {/* Botão remover */}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); removePhoto(i); }}
                style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'rgba(239,68,68,0.85)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', cursor: 'pointer', padding: 0,
                }}
                title="Remover foto"
              >
                <X size={13} />
              </button>
              {/* Legenda */}
              <input
                type="text"
                placeholder="Legenda (ex: Tela trincada)"
                value={photo.label}
                onClick={e => e.stopPropagation()}
                onChange={e => updateLabel(i, e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px',
                  background: 'rgba(0,0,0,0.55)', color: '#fff',
                  border: 'none', fontSize: '0.6875rem', outline: 'none',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Ações sutis */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: 'transparent',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem', color: 'var(--text-muted)',
            cursor: uploading ? 'wait' : 'pointer',
            opacity: uploading ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          {uploading
            ? <Upload size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : <Camera size={13} />}
          {uploading ? 'Enviando...' : 'Adicionar fotos'}
        </button>
        <button
          type="button"
          onClick={copyLink}
          disabled={!osId}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            color: copied ? 'var(--success)' : 'var(--text-muted)',
            cursor: osId ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            opacity: osId ? 1 : 0.5,
          }}
        >
          {copied ? <Check size={13} /> : <Link2 size={13} />}
          {copied ? 'Copiado!' : 'Link do checklist'}
        </button>
      </div>

      {/* Preview fullscreen da foto */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={preview.url}
            alt={preview.label || 'Foto'}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '85vh',
              borderRadius: 12, objectFit: 'contain',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          />
          {preview.label && (
            <p style={{
              position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              color: '#fff', fontSize: '0.875rem', fontWeight: 600,
              padding: '6px 16px', background: 'rgba(0,0,0,0.5)', borderRadius: 8,
              margin: 0, pointerEvents: 'none',
            }}>
              {preview.label}
            </p>
          )}
          <button
            onClick={() => setPreview(null)}
            style={{
              position: 'absolute', top: 20, right: 20,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
    </div>
  );
};

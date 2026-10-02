import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UploadCloud, Trash2, Check, Loader2, Film } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const GS_ID = '00000000-0000-0000-0000-000000000001';
const VIDEO_PATH = 'demo-video';

// Configuração do wizard público: vídeo de demonstração do step 1,
// enviado por arrasta e solta (bucket público wizard-assets).
export const SuperAdminWizard: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('global_settings')
        .select('wizard')
        .limit(1)
        .maybeSingle();
      setVideoUrl((data?.wizard as { video_url?: string } | null)?.video_url ?? null);
    } catch {
      setError('Erro ao carregar configuração do wizard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const saveUrl = async (url: string | null) => {
    const { error: saveErr } = await supabase
      .from('global_settings')
      .update({ wizard: { video_url: url }, updated_at: new Date().toISOString() })
      .eq('id', GS_ID);
    if (saveErr) {
      setError(`Erro ao salvar: ${saveErr.message}`);
      return false;
    }
    flashSaved();
    return true;
  };

  const uploadFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('video/')) {
      setError('Envie um arquivo de vídeo (mp4, webm...).');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Vídeo muito grande. O limite de upload é 50MB — comprima antes de enviar.');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const path = `${VIDEO_PATH}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('wizard-assets')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        setError(`Erro no upload: ${upErr.message}`);
        return;
      }
      const { data: pub } = supabase.storage.from('wizard-assets').getPublicUrl(path);
      if (await saveUrl(pub.publicUrl)) {
        setVideoUrl(pub.publicUrl);
      }
    } finally {
      setUploading(false);
    }
  };

  const removeVideo = async () => {
    if (videoUrl) {
      // Best effort: remove arquivos de vídeo do bucket
      const files = ['mp4', 'webm', 'mov', 'ogg', 'avi'].map(e => `${VIDEO_PATH}.${e}`);
      await supabase.storage.from('wizard-assets').remove(files).catch(() => {});
    }
    if (await saveUrl(null)) setVideoUrl(null);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card card-p"><div className="skeleton" style={{ height: 200 }} /></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.125rem' }}>Wizard de Cadastro (/comece-agora)</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Configure o vídeo de demonstração exibido na tela inicial do cadastro rápido —
          ele roda no meio do texto para criar expectativa no lead.
        </p>
      </div>

      <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Área de arrasta e solta */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) uploadFile(file);
          }}
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            padding: '36px 20px', borderRadius: 14, cursor: uploading ? 'wait' : 'pointer',
            border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
            background: dragOver ? 'var(--primary-light)' : 'transparent',
            transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>
                Enviando vídeo...
              </p>
            </>
          ) : (
            <>
              <UploadCloud size={32} color="var(--primary)" />
              <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Arraste o vídeo aqui
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ou clique para escolher · mp4/webm · até 50MB
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = '';
            }}
          />
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: 0 }}>{error}</p>}
        {saved && (
          <p style={{ color: '#16a34a', fontSize: '0.8125rem', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Check size={14} /> Configuração salva!
          </p>
        )}

        {/* Preview do vídeo atual */}
        {videoUrl ? (
          <div>
            <p style={{
              fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
              color: 'var(--text-muted)', letterSpacing: 0.5, margin: '0 0 8px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Film size={13} /> Vídeo atual no wizard
            </p>
            <video
              src={videoUrl}
              controls
              style={{ width: '100%', maxHeight: 320, borderRadius: 12, background: '#000' }}
            />
            <button className="btn btn-danger btn-sm" onClick={removeVideo} style={{ marginTop: 10 }}>
              <Trash2 size={14} /> Remover vídeo
            </button>
          </div>
        ) : (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Nenhum vídeo configurado — a tela inicial do wizard fica apenas com o texto.
          </p>
        )}
      </div>
    </div>
  );
};

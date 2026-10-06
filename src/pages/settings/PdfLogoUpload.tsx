import React, { useRef, useState, useEffect, useCallback } from 'react';
import { UploadCloud, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';

// Upload da logo usada no PDF das Ordens de Serviço (menu Empresa).
// Layout compacto: preview no topo + área de drag & drop abaixo.
// Prioridade no PDF: pdf_logo_url > tenant_themes.logo_url (Aparência) > sigla.
export const PdfLogoUpload: React.FC = () => {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId ?? '';
  const [pdfLogo, setPdfLogo] = useState<string | null>(null);
  const [themeLogo, setThemeLogo] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    const [settingsRes, themeRes] = await Promise.all([
      supabase
        .from('tenant_settings')
        .select('pdf_logo_url')
        .eq('tenant_id', tenantId)
        .maybeSingle(),
      supabase
        .from('tenant_themes')
        .select('logo_url')
        .eq('tenant_id', tenantId)
        .maybeSingle(),
    ]);
    setPdfLogo(settingsRes.data?.pdf_logo_url ?? null);
    setThemeLogo(themeRes.data?.logo_url ?? null);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const readFile = (file: File, cb: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => cb(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const save = async (dataUrl: string | null) => {
    setSaving(true);
    try {
      await supabase
        .from('tenant_settings')
        .update({ pdf_logo_url: dataUrl, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId);
      setPdfLogo(dataUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save PDF logo:', err);
    } finally {
      setSaving(false);
    }
  };

  const activeLogo = pdfLogo ?? themeLogo;
  const showThemeFallback = !pdfLogo && !!themeLogo;

  return (
    <div style={{ width: 160, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="form-label" style={{ fontSize: '0.6875rem' }}>Logo do PDF da OS</label>

      {activeLogo ? (
        <>
          {/* Logo ativa: preview + trocar/remover */}
          <div style={{
            width: '100%', height: 80, borderRadius: 10,
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
            background: 'transparent',
          }}>
            <img src={activeLogo} alt="Logo PDF" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
          </div>
          {showThemeFallback && (
            <p style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', margin: 0 }}>
              Usando logo da Aparência
            </p>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => !saving && inputRef.current?.click()}
            disabled={saving}
            style={{ gap: 4, padding: '4px 10px', fontSize: '0.625rem' }}
          >
            <UploadCloud size={11} /> Trocar
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--danger)', gap: 4, padding: '2px 10px', fontSize: '0.625rem' }}
            onClick={() => save(null)}
            disabled={saving}
          >
            <Trash2 size={11} /> Remover
          </button>
        </>
      ) : (
        <>
          {/* Sem logo: mostra o drag & drop */}
          <div style={{
            width: '100%', height: 56, borderRadius: 10,
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
            background: 'var(--bg-secondary, #f8fafc)',
          }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Sem logo</span>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) readFile(file, save);
            }}
            onClick={() => !saving && inputRef.current?.click()}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '10px 8px', borderRadius: 10,
              cursor: saving ? 'wait' : 'pointer',
              border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
              background: dragOver ? 'var(--primary-light)' : 'transparent',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <UploadCloud size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {saving ? 'Salvando...' : 'Arraste a logo'}
            </span>
            <span style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
              ou clique
            </span>
          </div>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) readFile(file, save);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />
      {saved && (
        <p style={{ fontSize: '0.5625rem', color: '#16a34a', margin: 0, fontWeight: 600 }}>
          ✓ Salva!
        </p>
      )}
    </div>
  );
};

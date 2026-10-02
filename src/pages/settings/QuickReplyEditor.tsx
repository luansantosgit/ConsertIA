import React, { useEffect, useRef, useState } from 'react';
import { X, Trash2, GripVertical, Upload, TextQuote, FileText } from 'lucide-react';
import { QuickReplyRepository, type QuickReply, type QuickReplyPart } from '@/repositories/quick-reply.repository';

// Editor de resposta rápida: atalho + partes sequenciais (texto/mídia).
// Sequências com 2+ partes são enviadas no chat com 1,5s entre cada.
export const QuickReplyEditor: React.FC<{
  reply: QuickReply | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ reply, onClose, onSaved }) => {
  const repo = new QuickReplyRepository();
  const [shortcut, setShortcut] = useState(reply?.shortcut ?? '');
  const [title, setTitle] = useState(reply?.title ?? '');
  const [parts, setParts] = useState<QuickReplyPart[]>(reply?.parts ?? [{ type: 'text', text: '' }]);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingIdx = useRef<number | null>(null);

  useEffect(() => {
    if (!shortcut) return;
    setShortcut(s => s.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
  }, [shortcut]);

  const setPart = (idx: number, patch: Partial<Extract<QuickReplyPart, { type: 'text' }>> & Partial<Extract<QuickReplyPart, { type: 'media' }>>) => {
    setParts(prev => prev.map((p, i) => (i === idx ? { ...p, ...patch } as QuickReplyPart : p)));
  };

  const addPart = (type: 'text' | 'media') => {
    setParts(prev => [...prev, type === 'text' ? { type: 'text', text: '' } : { type: 'media', url: '' }]);
  };

  const removePart = (idx: number) => {
    setParts(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const uploadFile = async (file: File, idx: number) => {
    setUploadingIdx(idx);
    setError(null);
    try {
      const url = await repo.uploadMedia(file);
      setPart(idx, { url });
    } catch (err) {
      setError(`Erro no upload: ${(err as Error).message}`);
    } finally {
      setUploadingIdx(null);
    }
  };

  const submit = async () => {
    if (!shortcut.trim() || !title.trim()) {
      setError('Informe o atalho e um título.');
      return;
    }
    const valid = parts.filter(p =>
      (p.type === 'text' && p.text.trim()) || (p.type === 'media' && p.url)
    );
    if (valid.length === 0) {
      setError('Adicione ao menos uma parte (texto ou mídia).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (reply) {
        await repo.update(reply.id, { shortcut: shortcut.trim(), title: title.trim(), parts: valid });
      } else {
        await repo.create({ shortcut: shortcut.trim(), title: title.trim(), parts: valid });
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message.includes('duplicate')
        ? 'Já existe uma resposta com este atalho.' : 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3 className="modal-title">{reply ? 'Editar resposta rápida' : 'Nova resposta rápida'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Atalho (digite / no chat)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>/</span>
                <input className="input" value={shortcut} onChange={e => setShortcut(e.target.value)} placeholder="endereco" style={{ marginBottom: 0 }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Título (aparece na lista)</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Endereço completo" style={{ marginBottom: 0 }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Mensagens da sequência {parts.length > 1 && (
                <span className="badge badge-primary" style={{ marginLeft: 6 }}>
                  {parts.length} partes · 1,5s entre envios
                </span>
              )}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {parts.map((part, idx) => (
                <div key={idx} style={{
                  display: 'flex', flexDirection: 'column', gap: 6,
                  padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary, #f8fafc)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <GripVertical size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      Parte {idx + 1} · {part.type === 'text' ? 'Texto' : 'Mídia'}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => removePart(idx)}
                      style={{ marginLeft: 'auto', color: 'var(--danger)', padding: 2 }}
                      title="Remover parte"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {part.type === 'text' ? (
                    <textarea
                      className="input"
                      rows={2}
                      value={part.text}
                      onChange={e => setPart(idx, { text: e.target.value })}
                      placeholder="Texto da mensagem..."
                      style={{ resize: 'vertical', marginBottom: 0 }}
                    />
                  ) : (
                    <>
                      <div
                        onDragOver={e => { e.preventDefault(); setDragIdx(idx); }}
                        onDragLeave={() => setDragIdx(null)}
                        onDrop={e => {
                          e.preventDefault();
                          setDragIdx(null);
                          const file = e.dataTransfer.files?.[0];
                          if (file) uploadFile(file, idx);
                        }}
                        onClick={() => { pendingIdx.current = idx; fileRef.current?.click(); }}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          padding: '18px 12px', borderRadius: 10, cursor: uploadingIdx === idx ? 'wait' : 'pointer',
                          border: `2px dashed ${dragIdx === idx ? 'var(--primary)' : 'var(--border)'}`,
                          background: dragIdx === idx ? 'var(--primary-light)' : 'transparent',
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                      >
                        {uploadingIdx === idx ? (
                          <>
                            <Upload size={20} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                              Enviando mídia...
                            </span>
                          </>
                        ) : part.url ? (
                          <>
                            {/* Preview real da mídia enviada */}
                            <MediaPreview url={part.url} />
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                              Mídia anexada — clique ou arraste outra para trocar
                            </span>
                          </>
                        ) : (
                          <>
                            <Upload size={20} color="var(--primary)" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              Arraste a mídia aqui
                            </span>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                              ou clique para escolher · imagem, vídeo, áudio ou PDF
                            </span>
                          </>
                        )}
                      </div>
                      <input className="input" value={part.caption ?? ''} onChange={e => setPart(idx, { caption: e.target.value })} placeholder="Legenda da mídia (opcional)" style={{ marginBottom: 0 }} />
                    </>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => addPart('text')}>
                <TextQuote size={13} /> + Texto
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => addPart('media')}>
                <Upload size={13} /> + Mídia
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                const idx = pendingIdx.current;
                if (file && idx !== null) uploadFile(file, idx);
                e.target.value = '';
              }}
            />
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: 0 }}>{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Preview da mídia anexada à parte (imagem, vídeo, áudio ou documento)
const MediaPreview: React.FC<{ url: string }> = ({ url }) => {
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase() ?? '';
  const fileName = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'mídia');

  if (['mp4', 'webm', 'mov', 'ogg'].includes(ext)) {
    return <video src={url} controls style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 8, background: '#000' }} />;
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) {
    return <audio src={url} controls style={{ width: '100%', maxWidth: 240 }} />;
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
    return (
      <img
        src={url}
        alt={fileName}
        style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 8, objectFit: 'cover' }}
      />
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
      <FileText size={18} color="var(--primary)" />
      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{fileName}</span>
    </div>
  );
};

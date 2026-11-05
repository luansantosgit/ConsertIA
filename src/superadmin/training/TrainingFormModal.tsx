import React, { useEffect, useRef, useState } from 'react';
import { Link2, Upload, Film } from 'lucide-react';
import type { TrainingVideo, TrainingVideoSource } from '@/types';
import type { TrainingVideoInput } from '@/repositories/training-video.repository';
import { detectVideoSource, parseYouTubeId, youtubeThumbUrl } from '@/lib/training-video';
import { uploadTrainingFile } from '@/lib/training-upload';

const TOPIC_SUGGESTIONS = ['Primeiros passos', 'Atendimento', 'Ordens de Serviço', 'Estoque', 'Financeiro', 'Configurações'];

interface Props {
  isOpen: boolean;
  video: TrainingVideo | null;
  topics: string[];
  onSubmit: (input: TrainingVideoInput, id?: string, old?: TrainingVideo) => Promise<boolean>;
  onClose: () => void;
}

/** Form de vídeo: YouTube por link ou upload ao Storage (com progresso). */
export const TrainingFormModal: React.FC<Props> = ({ isOpen, video, topics, onSubmit, onClose }) => {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('Primeiros passos');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState<TrainingVideoSource>('youtube');
  const [url, setUrl] = useState('');
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [active, setActive] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const saving = progress !== null;
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(video?.title ?? '');
    setTopic(video?.topic ?? 'Primeiros passos');
    setDescription(video?.description ?? '');
    setSource(video ? detectVideoSource(video.url) : 'youtube');
    setUrl(video?.url ?? '');
    setThumbUrl(video?.thumbnail_url ?? null);
    setSortOrder(video?.sort_order ?? 0);
    setActive(video?.active ?? true);
    setProgress(null);
    setError('');
  }, [isOpen, video]);

  const pickSource = (next: TrainingVideoSource) => {
    setSource(next);
    setUrl('');
    if (next === 'youtube') setThumbUrl(null);
  };

  const onUrlChange = (value: string) => {
    setUrl(value);
    const id = parseYouTubeId(value);
    setThumbUrl(id ? youtubeThumbUrl(id) : null);
  };

  const startUpload = async (file: File, isThumb: boolean) => {
    setError('');
    setProgress(0);
    try {
      const { publicUrl } = await uploadTrainingFile(file, setProgress);
      if (isThumb) setThumbUrl(publicUrl);
      else setUrl(publicUrl);
    } catch {
      setError('Falha no upload. Verifique a conexão e o tamanho do arquivo (máx. 1 GB).');
    } finally {
      setProgress(null);
    }
  };

  const submit = async () => {
    if (!title.trim() || !topic.trim() || !url) {
      setError('Preencha título, tópico e o vídeo (link ou arquivo).');
      return;
    }
    if (detectVideoSource(url) !== source) {
      setError(source === 'youtube' ? 'Cole um link válido do YouTube.' : 'Envie um arquivo de vídeo válido.');
      return;
    }
    const input: TrainingVideoInput = {
      title: title.trim(), description: description.trim(), topic: topic.trim(),
      source, url, thumbnail_url: thumbUrl, sort_order: sortOrder, active,
    };
    if (await onSubmit(input, video?.id, video ?? undefined)) onClose();
  };

  if (!isOpen) return null;
  const listedTopics = Array.from(new Set([...topics, ...TOPIC_SUGGESTIONS])).slice(0, 12);
  const ytId = parseYouTubeId(url);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3 className="modal-title">{video ? 'Editar vídeo' : 'Novo vídeo'}</h3>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Título *</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Como criar uma OS" />
            </div>
            <div className="form-group">
              <label className="form-label">Ordem</label>
              <input className="input" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tópico *</label>
            <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} list="training-topics" placeholder="Ex: Atendimento" />
            <datalist id="training-topics">
              {listedTopics.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea className="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que o usuário vai aprender?" />
          </div>
          <div className="form-group">
            <label className="form-label">Origem do vídeo *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className={`btn btn-sm ${source === 'youtube' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => pickSource('youtube')}>
                <Link2 size={14} /> Link do YouTube
              </button>
              <button type="button" className={`btn btn-sm ${source === 'storage' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => pickSource('storage')}>
                <Film size={14} /> Arquivo (upload)
              </button>
            </div>
            {source === 'youtube' ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <input ref={urlRef} className="input" value={url} onChange={(e) => onUrlChange(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                {ytId && <img src={youtubeThumbUrl(ytId)} alt="" style={{ width: 84, height: 47, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />}
              </div>
            ) : (
              <label className="btn btn-secondary btn-sm" style={{ marginTop: 8, cursor: 'pointer' }}>
                <Upload size={14} /> {url ? 'Trocar arquivo de vídeo' : 'Selecionar arquivo de vídeo'}
                <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" hidden
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) startUpload(f, false); }} />
              </label>
            )}
            {url && source === 'storage' && <span style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 6, display: 'block' }}>Arquivo do vídeo carregado ✓</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Thumbnail</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {thumbUrl && <img src={thumbUrl} alt="" style={{ width: 84, height: 47, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />}
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                <Upload size={14} /> Enviar imagem
                <input type="file" accept="image/jpeg,image/png,image/webp" hidden
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) startUpload(f, true); }} />
              </label>
              {thumbUrl && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setThumbUrl(null)}>Remover</button>
              )}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Ativo (visível no portal de treinamento)
          </label>
          {progress !== null && (
            <div>
              <div style={{ height: 8, borderRadius: 6, background: 'var(--hover-bg)', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.2s' }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enviando… {progress}%</span>
            </div>
          )}
          {error && <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--danger)' }}>{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Enviando…' : 'Salvar vídeo'}
          </button>
        </div>
      </div>
    </div>
  );
};

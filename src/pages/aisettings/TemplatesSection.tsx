import React, { useState } from 'react';
import { Plus, Trash2, ImageIcon, Type } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { ConfirmModal } from '@/components/ConfirmModal';
import EmptyState from '@/components/EmptyState';
import type { AiPreQuoteTemplate } from '@/types';

interface TemplatesSectionProps {
  templates: AiPreQuoteTemplate[];
  loading: boolean;
  onCreate: (template: Partial<AiPreQuoteTemplate>) => Promise<void>;
  onUpdate: (id: string, template: Partial<AiPreQuoteTemplate>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const EMPTY_FORM = { title: '', type: 'text' as 'text' | 'media', content: '', media_url: '', sort_order: 0 };

export const TemplatesSection: React.FC<TemplatesSectionProps> = ({ templates, loading, onCreate, onUpdate, onDelete }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        title: form.title.trim(),
        type: form.type,
        content: form.content.trim(),
        media_url: form.type === 'media' ? form.media_url.trim() || undefined : undefined,
        sort_order: Number(form.sort_order) || 0,
        active: true,
      });
      setForm(EMPTY_FORM);
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card card-p" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 4px' }}>{t('Templates Diferenciais')}</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            {t('Enviados antes do orçamento para gerar credibilidade e valor percebido. Podem ser texto ou mídia com legenda.')}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(v => !v)} disabled={loading}>
          <Plus size={16} /> {t('Novo template')}
        </button>
      </div>

      {adding && (
        <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('Título')}</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Garantia de 90 dias" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('Tipo')}</label>
              <select className="select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'text' | 'media' }))}>
                <option value="text">{t('Texto')}</option>
                <option value="media">{t('Mídia com legenda')}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('Ordem')}</label>
              <input className="input" type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
          </div>
          {form.type === 'media' && (
            <div className="form-group">
              <label className="form-label">{t('URL da mídia')}</label>
              <input className="input" value={form.media_url} onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))} placeholder="https://..." />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">{t(form.type === 'media' ? 'Legenda' : 'Conteúdo')}</label>
            <textarea className="input" rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.title.trim()}>
              {t('Salvar template')}
            </button>
            <button className="btn btn-ghost" onClick={() => setAdding(false)}>{t('Cancelar')}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card card-p">{t('Carregando templates...')}</div>
      ) : templates.length === 0 && !adding ? (
        <EmptyState
          title={t('Nenhum template cadastrado')}
          description={t('Crie templates diferenciais para enviar antes dos orçamentos e aumentar a conversão.')}
          actionLabel={t('Criar primeiro template')}
          onAction={() => setAdding(true)}
        />
      ) : (
        templates.map(template => (
          <div key={template.id} className="card card-p" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--primary-light)', color: 'var(--primary)',
            }}>
              {template.type === 'media' ? <ImageIcon size={20} /> : <Type size={20} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: '0.9375rem' }}>{template.title}</strong>
                <span className="badge badge-secondary">#{template.sort_order}</span>
                {!template.active && <span className="badge badge-muted">{t('Inativo')}</span>}
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
                {template.content}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="btn btn-sm btn-ghost" onClick={() => onUpdate(template.id, { active: !template.active })}>
                {template.active ? t('Desativar') : t('Ativar')}
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(template.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))
      )}

      <ConfirmModal
        isOpen={deleteId !== null}
        title={t('Excluir template')}
        message={t('Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.')}
        confirmLabel={t('Excluir')}
        variant="danger"
        onConfirm={async () => {
          if (deleteId) await onDelete(deleteId);
          setDeleteId(null);
        }}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Save, Check, Phone, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const SuperAdminSettings: React.FC = () => {
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('platform_settings')
        .select('id, support_whatsapp')
        .limit(1)
        .maybeSingle();
      if (err) throw err;
      setWhatsapp(data?.support_whatsapp ?? '');
    } catch {
      setError('Não foi possível carregar as configurações.');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    const clean = whatsapp.replace(/\D+/g, '');
    if (clean && (clean.length < 10 || clean.length > 15)) {
      setError('WhatsApp inválido — use DDI + DDD + número (ex: 5518997411233).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data: existing } = await supabase.from('platform_settings').select('id').limit(1).maybeSingle();
      if (existing?.id) {
        await supabase
          .from('platform_settings')
          .update({ support_whatsapp: clean, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('platform_settings').insert({ support_whatsapp: clean });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Falha ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page"><div className="card card-p"><div className="skeleton" style={{ height: 160 }} /></div></div>;
  }

  const waLink = `https://wa.me/${whatsapp.replace(/\D+/g, '')}`;

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Phone size={18} color="var(--primary)" /> Configurações da plataforma
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Contato de suporte/vendas exibido nos CTAs do site institucional.
          </p>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', fontSize: '0.875rem' }}>
            {error}
            <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /> Tentar novamente</button>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">WhatsApp de suporte/vendas</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="5518997411233"
              inputMode="tel"
            />
            <button className="btn btn-primary" onClick={save} disabled={saving || loading}>
              {saving ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />} Salvar
            </button>
            {saved && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontSize: '0.8125rem' }}>
                <Check size={14} /> Salvo!
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '6px 0 0' }}>
            Use o formato DDI + DDD + número, apenas dígitos. O site converte automaticamente em link wa.me.
          </p>
        </div>

        {whatsapp.replace(/\D+/g, '').length >= 10 && (
          <a
            className="btn btn-secondary btn-sm"
            href={waLink}
            target="_blank"
            rel="noreferrer"
            style={{ alignSelf: 'flex-start' }}
          >
            <Phone size={14} /> Testar link: {waLink}
          </a>
        )}
      </div>
    </div>
  );
};

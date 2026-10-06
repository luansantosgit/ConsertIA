import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Coins } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ConfirmModal } from '@/components/ConfirmModal';

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  active: boolean;
  sort_order: number;
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Pacotes de tokens de IA que as empresas compram via Asaas.
// Configurados pelo superadmin no menu Provedor de IA.
export const TokenPackagesSection: React.FC = () => {
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<TokenPackage | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', tokens: '', price: '', sort_order: '0' });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('token_packages')
      .select('*')
      .order('sort_order', { ascending: true });
    setPackages((data ?? []) as TokenPackage[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ name: '', tokens: '', price: '', sort_order: '0' });
    setEditing(null);
    setCreating(true);
    setError(null);
  };

  const openEdit = (pkg: TokenPackage) => {
    setForm({
      name: pkg.name,
      tokens: String(pkg.tokens),
      price: String(pkg.price),
      sort_order: String(pkg.sort_order),
    });
    setEditing(pkg);
    setCreating(false);
    setError(null);
  };

  const closeForm = () => { setEditing(null); setCreating(false); };

  const submit = async () => {
    const name = form.name.trim();
    const tokens = parseInt(form.tokens);
    const price = parseFloat(form.price.replace(',', '.'));
    if (!name || !Number.isFinite(tokens) || tokens <= 0) {
      setError('Informe o nome e a quantidade de tokens.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        tokens,
        price: Number.isFinite(price) ? price : 0,
        sort_order: parseInt(form.sort_order) || 0,
      };
      if (editing) {
        await supabase.from('token_packages').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
      } else {
        await supabase.from('token_packages').insert({ ...payload, active: true });
      }
      closeForm();
      await load();
    } catch {
      setError('Erro ao salvar pacote.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (pkg: TokenPackage) => {
    await supabase.from('token_packages').update({ active: !pkg.active }).eq('id', pkg.id);
    await load();
  };

  const remove = async () => {
    if (!deleteId) return;
    await supabase.from('token_packages').delete().eq('id', deleteId);
    setDeleteId(null);
    await load();
  };

  return (
    <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Coins size={18} color="var(--primary)" /> Pacotes de Tokens
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Ofertas que as empresas compram pelo Asaas quando a cota de IA esgota.
            O valor pago vira saldo de tokens na cota da empresa.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} disabled={loading}>
          <Plus size={15} /> Novo pacote
        </button>
      </div>

      {(creating || editing) && (
        <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Pacote 100k" />
            </div>
            <div className="form-group">
              <label className="form-label">Tokens *</label>
              <input className="input" type="number" min="1" value={form.tokens} onChange={e => setForm(f => ({ ...f, tokens: e.target.value }))} placeholder="100000" />
            </div>
            <div className="form-group">
              <label className="form-label">Preço (R$) *</label>
              <input className="input" type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="29.90" />
            </div>
            <div className="form-group">
              <label className="form-label">Ordem</label>
              <input className="input" type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
            </div>
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={submit} disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar pacote'}
            </button>
            <button className="btn btn-ghost" onClick={closeForm} disabled={saving}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
      ) : packages.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: 16 }}>
          Nenhum pacote configurado. Crie pacotes para as empresas comprarem tokens extras.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {packages.map(pkg => (
            <div key={pkg.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'var(--primary-light)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Coins size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {pkg.name}
                  {!pkg.active && <span className="badge badge-gray">Inativo</span>}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  {pkg.tokens.toLocaleString('pt-BR')} tokens por {fmt(pkg.price)}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(pkg)}>
                {pkg.active ? 'Desativar' : 'Ativar'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(pkg)} title="Editar"><Pencil size={14} /></button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(pkg.id)} title="Excluir"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Excluir pacote"
        message="As empresas não poderão mais comprar este pacote. Confirma?"
        variant="danger"
        onConfirm={remove}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
};

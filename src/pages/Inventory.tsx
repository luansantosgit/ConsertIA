import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, AlertTriangle, Package, X, ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import type { Product } from '@/types';
import { ProductRepository } from '@/repositories/product.repository';
import { StockMovementRepository } from '@/repositories/stock-movement.repository';
import { SkeletonStats, SkeletonTable } from '@/components/Skeleton';
import { CurrencyInput } from '@/components/CurrencyInput';
import { formatCurrency } from '@/lib/format';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useTranslation } from '@/hooks/useTranslation';

interface StockItem extends Product {
  location?: string;
  category: string;
  movements: { type: 'in' | 'out'; qty: number; ref: string; date: string }[];
}

const productRepo = new ProductRepository();
const stockMovementRepo = new StockMovementRepository();

type MovModal = { item: StockItem; type: 'in' | 'out' } | null;

export const Inventory: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<StockItem[]>([]);
  const [search, setSearch] = useState('');
  const [movModal, setMovModal] = useState<MovModal>(null);
  const [movQty, setMovQty] = useState('1');
  const [movRef, setMovRef] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', sku: '', price: '', cost: '', min_stock_quantity: '2', category: 'Displays', location: '', partType: '', deviceBrand: '', deviceModel: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; item: StockItem | null; bulk: boolean }>({ isOpen: false, item: null, bulk: false });

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const products = await productRepo.getAll();
      const stockItems: StockItem[] = products.map(p => ({
        ...p,
        category: (p as unknown as { category?: string }).category || 'Outros',
        location: (p as unknown as { location?: string }).location || '',
        movements: [],
      }));
      setItems(stockItems);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setError('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.sku.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = items.filter(i => i.stock_quantity <= (i.min_stock_quantity ?? 0));
  const outOfStock = items.filter(i => i.stock_quantity === 0);

  const handleMovement = async () => {
    if (!movModal) return;
    const qty = parseInt(movQty);
    if (isNaN(qty) || qty <= 0) return;

    try {
      const newQty = movModal.type === 'in'
        ? movModal.item.stock_quantity + qty
        : Math.max(0, movModal.item.stock_quantity - qty);

      await stockMovementRepo.create({
        product_id: movModal.item.id,
        type: movModal.type,
        quantity: qty,
        reference_id: movRef || undefined,
        notes: movModal.type === 'in' ? 'Entrada manual' : 'Saída manual',
      });

      await productRepo.update(movModal.item.id, { stock_quantity: newQty } as Partial<Product>);

      setItems(prev => prev.map(item =>
        item.id === movModal.item.id
          ? { ...item, stock_quantity: newQty }
          : item
      ));
    } catch (error) {
      console.error('Failed to create movement:', error);
    }

    setMovModal(null);
    setMovQty('1');
    setMovRef('');
  };

  const handleAdd = async () => {
    if (adding || !newForm.name) return;
    setAdding(true);

    try {
      const created = await productRepo.create({
        name: newForm.name,
        sku: newForm.sku || `SKU-${Date.now()}`,
        price: parseFloat(newForm.price) || 0,
        cost: parseFloat(newForm.cost) || 0,
        stock_quantity: 0,
        min_stock_quantity: parseInt(newForm.min_stock_quantity) || 2,
        category: newForm.category,
        part_type: newForm.partType || null,
        device_brand: newForm.deviceBrand || null,
        device_model: newForm.deviceModel || null,
        active: true,
      } as Partial<Product>);

      const newItem: StockItem = {
        ...created,
        category: newForm.category,
        location: newForm.location,
        movements: [],
      };

      setItems(prev => [newItem, ...prev]);
      setShowAddModal(false);
      setNewForm({ name: '', sku: '', price: '', cost: '', min_stock_quantity: '2', category: 'Displays', location: '', partType: '', deviceBrand: '', deviceModel: '' });
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!confirmDelete.item) return;
    try {
      await productRepo.delete(confirmDelete.item.id);
      setItems(prev => prev.filter(i => i.id !== confirmDelete.item!.id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(confirmDelete.item!.id); return n; });
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
    setConfirmDelete({ isOpen: false, item: null, bulk: false });
  };

  const handleDeleteBulk = async () => {
    try {
      for (const id of selectedIds) {
        await productRepo.delete(id);
      }
      setItems(prev => prev.filter(i => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to delete products:', error);
    }
    setConfirmDelete({ isOpen: false, item: null, bulk: false });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(i => i.id)));
    }
  };

  const stockStatus = (item: StockItem) => {
    if (item.stock_quantity === 0) return { label: t('Sem estoque'), badge: 'badge-danger', glow: '#ef4444' };
    if (item.stock_quantity <= (item.min_stock_quantity ?? 0)) return { label: t('Estoque baixo'), badge: 'badge-warning', glow: '#f59e0b' };
    return { label: t('Em estoque'), badge: 'badge-success', glow: '#10b981' };
  };

  React.useEffect(() => {
    const handler = () => setShowAddModal(true);
    window.addEventListener('header-action-click', handler);
    return () => window.removeEventListener('header-action-click', handler);
  }, []);

  return (
    <div className="page">
      {error && <ErrorMessage message={error} onRetry={() => { setError(null); fetchProducts(); }} />}
      {!error && loading && (
        <>
          <SkeletonStats />
          <SkeletonTable />
        </>
      )}
      {!error && !loading && (
      <>
      {lowStock.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, color: '#92400e' }}>
          <AlertTriangle size={16} color="#f59e0b" />
          <p style={{ fontSize: '0.875rem' }}>
            <strong>{lowStock.length} {lowStock.length === 1 ? 'item' : 'itens'} com estoque baixo</strong> — {outOfStock.length > 0 && <span style={{ color: '#dc2626' }}>{outOfStock.length} sem estoque</span>}
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {[
          { label: t('Novo Item'), value: items.length, color: '#4f46e5', bg: '#eef2ff' },
          { label: t('Estoque baixo'), value: lowStock.length, color: '#f59e0b', bg: '#fffbeb' },
          { label: t('Sem estoque'), value: outOfStock.length, color: '#ef4444', bg: '#fef2f2' },
          { label: 'R$', value: 'R$' + items.reduce((a, i) => a + i.stock_quantity * (i.cost || 0), 0).toLocaleString('pt-BR'), color: '#10b981', bg: '#ecfdf5' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Package size={18} color={s.color} />
            </div>
            <p style={{ fontSize: '1.375rem', fontWeight: 800, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ minWidth: 280 }}>
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input placeholder="Buscar produto por nome, SKU ou categoria..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {selectedIds.size > 0 && (
          <button
            className="btn btn-sm"
            style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', gap: 6 }}
            onClick={() => setConfirmDelete({ isOpen: true, item: null, bulk: true })}
          >
            <Trash2 size={13} />
            Excluir {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'itens'}
          </button>
        )}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ paddingLeft: 20, width: 40 }}>
                <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
              </th>
              <th>Produto / SKU</th>
              <th>{t('Categoria')}</th>
              <th>{t('Endereço')}</th>
              <th>{t('Preco Venda')}</th>
              <th>{t('Custo')}</th>
              <th>{t('Estoque')}</th>
              <th>{t('Status')}</th>
              <th style={{ textAlign: 'right', paddingRight: 20 }}>{t('Ações')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const st = stockStatus(item);
              return (
                <tr key={item.id}>
                  <td style={{ paddingLeft: 20 }}>
                    <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} />
                  </td>
                  <td style={{ paddingLeft: 20 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.sku}</p>
                  </td>
                  <td><span className="badge badge-gray">{item.category}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{item.location || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(item.price)}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{formatCurrency(item.cost || 0)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: '1.125rem', fontWeight: 800,
                        color: item.stock_quantity === 0 ? 'var(--danger)' : item.stock_quantity <= (item.min_stock_quantity ?? 0) ? 'var(--warning)' : 'var(--text-primary)',
                      }}>{item.stock_quantity}</span>
                      <div style={{ flex: 1, height: 4, background: '#f1f5f9', borderRadius: 99, minWidth: 40, maxWidth: 60, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: st.glow, width: Math.min(100, (item.stock_quantity / Math.max(item.min_stock_quantity! * 3, 10)) * 100) + '%', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  </td>
                  <td><span className={'badge ' + st.badge}>{st.label}</span></td>
                  <td style={{ textAlign: 'right', paddingRight: 20 }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm" style={{ background: '#ecfdf5', color: '#10b981', border: '1px solid #6ee7b7', borderRadius: 8, gap: 4 }} onClick={() => setMovModal({ item, type: 'in' })}>
                        <ArrowDown size={12} />Entrada
                      </button>
                      <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 8, gap: 4 }} onClick={() => setMovModal({ item, type: 'out' })}>
                        <ArrowUp size={12} />Saída
                      </button>
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--text-muted)', gap: 4 }} onClick={() => setConfirmDelete({ isOpen: true, item, bulk: false })} title="Excluir produto">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyState
            icon={Package}
            title="Nenhum produto encontrado"
            description="Adicione itens ao estoque para comecar."
            actionLabel="Novo item"
            onAction={() => setShowAddModal(true)}
          />
        )}
      </div>

      {movModal && (
        <div className="modal-overlay" onClick={() => setMovModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {movModal.type === 'in' ? 'Entrada de Estoque' : 'Saída de Estoque'}
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setMovModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 8, marginBottom: 4 }}>
                <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{movModal.item.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estoque atual: <strong>{movModal.item.stock_quantity}</strong></p>
              </div>
              <div className="form-group">
                <label className="form-label">Quantidade *</label>
                <input className="input" type="number" min="1" value={movQty} onChange={e => setMovQty(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Referência (OS ou fornecedor)</label>
                <input className="input" value={movRef} onChange={e => setMovRef(e.target.value)} placeholder={movModal.type === 'in' ? 'Ex: Fornecedor ABC' : 'Ex: OS-0124'} />
              </div>
              <div style={{ padding: '10px 14px', background: movModal.type === 'in' ? '#ecfdf5' : '#fef2f2', borderRadius: 8, fontSize: '0.875rem', color: movModal.type === 'in' ? '#065f46' : '#991b1b' }}>
                {movModal.type === 'in'
                  ? 'Estoque passará de ' + movModal.item.stock_quantity + ' > ' + (movModal.item.stock_quantity + parseInt(movQty || '0'))
                  : 'Estoque passará de ' + movModal.item.stock_quantity + ' > ' + Math.max(0, movModal.item.stock_quantity - parseInt(movQty || '0'))
                }
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setMovModal(null)}>Cancelar</button>
              <button className="btn" onClick={handleMovement} style={{ background: movModal.type === 'in' ? '#10b981' : '#ef4444', color: '#fff', border: 'none' }}>
                {movModal.type === 'in' ? 'Confirmar Entrada' : 'Confirmar Saída'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Novo Item de Estoque</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nome do produto *</label>
                  <input className="input" value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Display iPhone 14 Pro" />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input className="input" value={newForm.sku} onChange={e => setNewForm(f => ({ ...f, sku: e.target.value }))} placeholder="DIP14P-001" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Preço de venda</label>
                  <CurrencyInput
                    value={Number(newForm.price) || 0}
                    onChange={v => setNewForm(f => ({ ...f, price: String(v) }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Custo</label>
                  <CurrencyInput
                    value={Number(newForm.cost) || 0}
                    onChange={v => setNewForm(f => ({ ...f, cost: String(v) }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tipo de peça</label>
                  <input className="input" value={newForm.partType} onChange={e => setNewForm(f => ({ ...f, partType: e.target.value }))} placeholder="Ex: tela, vidro, bateria" />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Usado pelo agente de IA para localizar a peça nos orçamentos.
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Marca do aparelho</label>
                  <input className="input" value={newForm.deviceBrand} onChange={e => setNewForm(f => ({ ...f, deviceBrand: e.target.value }))} placeholder="Ex: Samsung" />
                </div>
                <div className="form-group">
                  <label className="form-label">Modelo do aparelho</label>
                  <input className="input" value={newForm.deviceModel} onChange={e => setNewForm(f => ({ ...f, deviceModel: e.target.value }))} placeholder="Ex: Galaxy S22" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select className="select" value={newForm.category} onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))}>
                    {['Displays', 'Baterias', 'Conectores', 'Armazenamento', 'Carcaças', 'Outros'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estoque mínimo</label>
                  <input className="input" type="number" value={newForm.min_stock_quantity} onChange={e => setNewForm(f => ({ ...f, min_stock_quantity: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Localização</label>
                <input className="input" value={newForm.location} onChange={e => setNewForm(f => ({ ...f, location: e.target.value }))} placeholder="Ex: Prateleira A1" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={adding}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={adding || !newForm.name.trim()}>
                {adding ? 'Adicionando...' : <><Plus size={15} />Adicionar item</>}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, item: null, bulk: false })}
        onConfirm={confirmDelete.bulk ? handleDeleteBulk : handleDeleteSingle}
        title={confirmDelete.bulk ? 'Excluir Itens Selecionados' : 'Excluir Produto'}
        message={
          confirmDelete.bulk
            ? `Tem certeza que deseja excluir ${selectedIds.size} ${selectedIds.size === 1 ? 'item' : 'itens'}? Esta acao nao pode ser desfeita.`
            : `Tem certeza que deseja excluir "${confirmDelete.item?.name || ''}"? Todo o historico de movimentacoes sera removido.`
        }
        variant="danger"
      />
    </div>
  );
};

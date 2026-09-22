import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, MessageSquare, User, Send } from 'lucide-react';
import { CustomerRepository } from '@/repositories/customer.repository';
import type { Customer } from '@/types';
import type { ChatMessage, ConvRow, ForwardTarget } from './types';

interface ForwardModalProps {
  isOpen: boolean;
  message: ChatMessage | null;
  conversations: ConvRow[];
  onForward: (target: ForwardTarget) => void;
  onClose: () => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  isOpen,
  message,
  conversations,
  onForward,
  onClose,
}) => {
  const [tab, setTab] = useState<'conversations' | 'contacts'>('conversations');
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<ForwardTarget | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setTab('conversations');
    setSending(null);
    const loadCustomers = async () => {
      setLoading(true);
      try {
        const repo = new CustomerRepository();
        setCustomers(await repo.getAll());
      } catch (err) {
        console.error('Failed to load customers:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCustomers();
  }, [isOpen]);

  const term = search.trim().toLowerCase();

  const filteredConversations = useMemo(() => {
    if (!term) return conversations;
    return conversations.filter(c =>
      c.contactName?.toLowerCase().includes(term) || c.contact_phone.toLowerCase().includes(term)
    );
  }, [conversations, term]);

  const filteredCustomers = useMemo(() => {
    if (!term) return customers;
    return customers.filter(c =>
      c.name?.toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term) ||
      (c.mobile || '').toLowerCase().includes(term)
    );
  }, [customers, term]);

  const handleForward = (target: ForwardTarget) => {
    setSending(target);
    onForward(target);
    onClose();
  };

  if (!isOpen || !message) return null;

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '10px 12px', background: 'none', border: 'none',
    cursor: 'pointer', textAlign: 'left', borderRadius: 8,
    transition: 'background 0.1s',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Encaminhar Mensagem</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {message.text || 'Mensagem'}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversa ou contato..."
              style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '0.8125rem', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '12px 16px 0' }}>
          {([['conversations', 'Conversas', MessageSquare], ['contacts', 'Contatos', User]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 0', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600,
                background: tab === key ? '#ede9fe' : 'transparent',
                color: tab === key ? 'var(--primary)' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
          {tab === 'conversations' ? (
            filteredConversations.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)', padding: 24 }}>
                Nenhuma conversa encontrada.
              </p>
            ) : (
              filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => handleForward({ type: 'conversation', id: conv.id })}
                  style={itemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MessageSquare size={14} color="var(--primary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.contactName}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {conv.contact_phone}
                    </p>
                  </div>
                  <Send size={14} color={sending?.id === conv.id ? 'var(--primary)' : 'var(--text-muted)'} />
                </button>
              ))
            )
          ) : loading ? (
            <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)', padding: 24 }}>
              Carregando contatos...
            </p>
          ) : (
            filteredCustomers.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)', padding: 24 }}>
                Nenhum contato encontrado.
              </p>
            ) : (
              filteredCustomers.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => handleForward({ type: 'customer', id: customer.id })}
                  style={itemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: '0.75rem', color: 'var(--primary)' }}>
                    {customer.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {customer.name}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {customer.phone || customer.mobile || 'Sem telefone'}
                    </p>
                  </div>
                  <Send size={14} color="var(--text-muted)" />
                </button>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};

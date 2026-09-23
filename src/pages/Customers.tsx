import React, { useState, useEffect, useCallback } from 'react';
import { SolidActionSearch } from '@/components/SolidActionIcons';
import { useTranslation } from '@/hooks/useTranslation';
import type { Customer } from '@/types';
import { CustomerRepository } from '@/repositories/customer.repository';
import ErrorMessage from '@/components/ErrorMessage';
import { ConfirmModal } from '@/components/ConfirmModal';
import { CustomerModal } from './customers/CustomerModal';
import { StartChatModal } from './customers/StartChatModal';
import { CustomerTable } from './customers/CustomerTable';

const customerRepo = new CustomerRepository();

export const Customers: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [chatCustomer, setChatCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [deleteChatInfo, setDeleteChatInfo] = useState<{ hasChat: boolean; messageCount: number }>({
    hasChat: false, messageCount: 0,
  });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await customerRepo.getAll({ search: searchTerm || undefined });
      setCustomers(data);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      setError('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const handleSave = (c: Customer) => {
    setCustomers(prev => {
      const exists = prev.find(p => p.id === c.id);
      return exists ? prev.map(p => p.id === c.id ? c : p) : [c, ...prev];
    });
  };

  const handleRequestDelete = async (c: Customer) => {
    setDeleteCustomer(c);
    setDeleteChatInfo({ hasChat: false, messageCount: 0 });
    try {
      const info = await customerRepo.checkLinkedChat(c);
      setDeleteChatInfo(info);
    } catch (err) {
      console.error('Erro ao verificar chat do cliente:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteCustomer) return;
    const target = deleteCustomer;
    // Otimista: fecha o modal e remove o cliente instantaneamente da tela
    setDeleteCustomer(null);
    setCustomers(prev => prev.filter(c => c.id !== target.id));

    try {
      // Exclui o cliente e limpa todas as conversas/mensagens/leads vinculados
      await customerRepo.delete(target.id, true);
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      // Reverte o estado em caso de falha no banco
      setCustomers(prev => [target, ...prev]);
      setError(t('Não foi possível excluir o cliente. Verifique suas permissões ou vínculos.'));
    }
  };

  useEffect(() => {
    const handler = () => { setEditingCustomer(null); setModalOpen(true); };
    window.addEventListener('header-action-click', handler);
    return () => window.removeEventListener('header-action-click', handler);
  }, []);

  return (
    <div className="page">
      {error && <ErrorMessage message={error} onRetry={() => { setError(null); fetchCustomers(); }} />}
      {!error && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {t('Total')}: <strong style={{ color: 'var(--text-primary)' }}>{customers.length} {t('clientes')}</strong>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="search-wrap" style={{ maxWidth: 280 }}>
                <SolidActionSearch size={15} style={{ flexShrink: 0 }} />
                <input
                  placeholder={t('Buscar clientes...')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            <CustomerTable
              customers={customers}
              loading={loading}
              onStartChat={c => setChatCustomer(c)}
              onEdit={c => { setEditingCustomer(c); setModalOpen(true); }}
              onDelete={handleRequestDelete}
              onNewCustomer={() => { setEditingCustomer(null); setModalOpen(true); }}
            />
          </div>

          {modalOpen && (
            <CustomerModal
              customer={editingCustomer}
              onClose={() => setModalOpen(false)}
              onSave={handleSave}
            />
          )}

          {chatCustomer && (
            <StartChatModal
              customer={chatCustomer}
              isOpen={Boolean(chatCustomer)}
              onClose={() => setChatCustomer(null)}
            />
          )}

          <ConfirmModal
            isOpen={Boolean(deleteCustomer)}
            onClose={() => setDeleteCustomer(null)}
            onConfirm={handleDelete}
            title={deleteChatInfo.hasChat ? t('Excluir Cliente e Histórico de Chat') : t('Excluir')}
            message={
              deleteChatInfo.hasChat
                ? `${t('Atenção: Este cliente possui conversas e mensagens vinculadas no chat. Ao confirmar a exclusão, todo o histórico de conversas, mensagens e registros deste lead serão excluídos definitivamente de todo o banco de dados.')} (${deleteCustomer?.name})`
                : `${t('Tem certeza que deseja excluir?')} (${deleteCustomer?.name})`
            }
            confirmLabel={deleteChatInfo.hasChat ? t('Excluir Tudo') : t('Excluir')}
            cancelLabel={t('Cancelar')}
            variant="danger"
          />
        </>
      )}
    </div>
  );
};

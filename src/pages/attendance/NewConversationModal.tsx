import React, { useEffect, useRef, useState } from 'react';
import { Search, User } from 'lucide-react';
import { CustomerRepository } from '@/repositories/customer.repository';
import { SkeletonLine, SkeletonCircle } from '@/components/Skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import type { Customer } from '@/types';
import type { AttendanceModalsState } from './useAttendanceModals';

/**
 * "Nova Conversa" simplificada (padrão WhatsApp):
 * - um único input: digita número OU nome
 * - ao digitar, busca contatos salvos e lista na hora (nome e número)
 * - clicando num contato: abre o chat dele direto
 * - número novo: "Iniciar Chat" abre a conversa só com o número como
 *   referência, sem salvar nome — o webhook preenche o nome do perfil
 *   do lead quando ele responder
 */
export const NewConversationModal: React.FC<{ m: AttendanceModalsState }> = ({ m }) => {
  const { t } = useTranslation();
  const repoRef = useRef<CustomerRepository | null>(null);
  const [term, setTerm] = useState(m.newConvPhone);
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);

  // Busca debounced ao digitar (nome ou número)
  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = window.setTimeout(async () => {
      try {
        if (!repoRef.current) repoRef.current = new CustomerRepository();
        const found = await repoRef.current.search(q);
        setResults(found.slice(0, 6));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [term]);

  const digits = term.replace(/\D/g, '');
  const canStart = digits.length >= 10;

  const startWithCustomer = (customer: Customer) => {
    const phone = (customer.mobile || customer.phone || '').replace(/\D/g, '');
    if (phone.length < 10) return;
    m.setNewConvPhone(phone);
    void m.handleStartNewConversation({ phone, customerId: customer.id, name: customer.name });
  };

  const startWithPhone = () => {
    if (!canStart || m.creatingConversation) return;
    void m.handleStartNewConversation({ phone: digits });
  };

  const close = () => {
    m.setNewConvPhone(term);
    m.setShowNewConvModal(false);
  };

  const rowStyle = (): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '8px 10px', border: 'none', borderRadius: 10, cursor: 'pointer',
    background: 'transparent', textAlign: 'left', fontFamily: 'inherit',
  });

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3 className="modal-title">{t('Nova Conversa')}</h3>
          <button className="btn btn-ghost btn-icon" onClick={close}><span style={{ fontSize: 16 }}>&times;</span></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('Número ou nome do cliente')}</label>
            <div className="search-wrap" style={{ height: 40 }}>
              <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                autoFocus
                placeholder="Ex: João ou 5511999999999"
                value={term}
                onChange={e => setTerm(e.target.value)}
                onKeyDown={e => {
                  if (e.key !== 'Enter') return;
                  // Enter: prioriza o contato listado; sem resultados, inicia pelo número
                  if (results.length > 0) startWithCustomer(results[0]);
                  else startWithPhone();
                }}
                style={{ fontSize: '0.875rem' }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
              {t('Digite um contato salvo ou um número novo para começar a conversar')}
            </p>
          </div>

          {searching && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0, 1].map(i => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <SkeletonCircle width={34} height={34} />
                  <SkeletonLine width={`${60 - i * 15}%`} height={12} />
                </div>
              ))}
            </div>
          )}

          {!searching && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {results.map(customer => (
                <button
                  key={customer.id}
                  style={rowStyle()}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => startWithCustomer(customer)}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--primary-light)', color: 'var(--primary-text)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.8125rem',
                  }}>
                    {customer.name?.charAt(0) || <User size={15} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {customer.name}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {customer.mobile || customer.phone}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={close}>{t('Cancelar')}</button>
          <button
            className="btn btn-primary"
            onClick={startWithPhone}
            disabled={!canStart || m.creatingConversation}
            title={!canStart ? t('Digite um número válido com DDD') : undefined}
          >
            {m.creatingConversation ? t('Iniciando...') : t('Iniciar Conversa')}
          </button>
        </div>
      </div>
    </div>
  );
};

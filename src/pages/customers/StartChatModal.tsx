import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Customer, Connection } from '@/types';
import { ConnectionRepository } from '@/repositories/connection.repository';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { useTranslation } from '@/hooks/useTranslation';
import { ChannelSelector } from './ChannelSelector';

const connRepo = new ConnectionRepository();
const convRepo = new ConversationRepository();
const msgRepo = new MessageRepository();

interface StartChatModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

export const StartChatModal: React.FC<StartChatModalProps> = ({ customer, isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<string>('');
  const [phone, setPhone] = useState(customer.phone || customer.mobile || '');
  const [initialMessage, setInitialMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPhone(customer.phone || customer.mobile || '');
    const fetchChannels = async () => {
      setLoading(true);
      try {
        const conns = await connRepo.getAll();
        const active = conns.filter(c => c.status === 'connected');
        const available = active.length > 0 ? active : conns;
        setConnections(available);
        if (available.length > 0) setSelectedConnId(available[0].id);
      } catch (err) {
        console.error('Failed to load connections:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const handleStartChat = async () => {
    if (!phone.trim()) {
      setError(t('Telefone é obrigatório para iniciar o chat'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const allConvs = await convRepo.getAll();
      let conv = allConvs.find(c => 
        c.customer_id === customer.id || 
        (cleanPhone && c.contact_phone && c.contact_phone.replace(/\D/g, '').includes(cleanPhone))
      );

      if (!conv) {
        conv = await convRepo.create({
          customer_id: customer.id,
          contact_name: customer.name,
          contact_phone: phone,
          status: 'open',
          unread_count: 0,
          last_message: initialMessage.trim() || undefined,
          last_message_at: new Date().toISOString(),
        });
      }

      if (initialMessage.trim() && conv) {
        let waMessageId: string | undefined;
        let msgStatus: 'pending' | 'sent' | 'delivered' | 'read' | 'error' = 'sent';

        if (selectedConnId) {
          try {
            const { sendTextMessage } = await import('@/lib/api-alternativa.service');
            const result = await sendTextMessage(selectedConnId, phone, initialMessage.trim());
            if (result.success) {
              waMessageId = result.messageId;
              msgStatus = (result.status as 'pending' | 'sent' | 'delivered' | 'read' | 'error') || 'sent';
            }
          } catch (e) {
            console.error('Failed to send WhatsApp message:', e);
          }
        }

        await msgRepo.create({
          conversation_id: conv.id,
          contact_phone: phone,
          content: initialMessage.trim(),
          direction: 'outbound',
          read: true,
          status: msgStatus,
          wa_message_id: waMessageId,
        });

        await convRepo.update(conv.id, {
          last_message: initialMessage.trim(),
          last_message_at: new Date().toISOString(),
        });
      }

      onClose();
      navigate(`/atendimento?conversationId=${conv.id}`);
    } catch (err) {
      console.error('Failed to start chat:', err);
      setError(t('Erro ao iniciar chat'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1rem', fontWeight: 700 }}>{t('Iniciar Conversa')}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{customer.name}</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{t('Telefone')} / WhatsApp *</label>
            <input
              className="input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('Canal WhatsApp')}</label>
            <ChannelSelector
              loading={loading}
              connections={connections}
              selectedConnId={selectedConnId}
              onSelect={setSelectedConnId}
              onClose={onClose}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('Mensagem inicial')} ({t('Opcional')})</label>
            <textarea
              className="textarea"
              rows={3}
              value={initialMessage}
              onChange={e => setInitialMessage(e.target.value)}
              placeholder={t('Olá! Como podemos te ajudar?')}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            {t('Cancelar')}
          </button>
          <button className="btn btn-primary" onClick={handleStartChat} disabled={submitting} style={{ gap: 6 }}>
            <Send size={14} />
            {submitting ? t('Iniciando...') : t('Iniciar Chat')}
          </button>
        </div>
      </div>
    </div>
  );
};

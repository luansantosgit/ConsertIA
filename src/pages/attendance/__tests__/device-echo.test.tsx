import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';
import { toChatMessage } from '../types';
import type { ChatMessage } from '../types';
import type { Message } from '@/types';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

/**
 * Issue #105 — o "echo": quando o atendente responde pelo CELULAR, a
 * mensagem precisa aparecer no chat com o rotulo "Enviado pelo aparelho".
 */
const baseBubble = (msg: ChatMessage) => ({
  msg,
  hovered: false,
  osList: [],
  onReact: () => {},
  onMention: () => {},
  onEdit: () => {},
  onRequestDelete: () => {},
  onForward: () => {},
  onViewPdfOS: () => {},
  onFetchMedia: () => {},
});

const deviceMsg: ChatMessage = {
  id: 'm1',
  from: 'attendant',
  text: 'Ja deixamos o aparelho pronto',
  time: '14:32',
  sentFromDevice: true,
};

describe('Echo — resposta enviada pelo aparelho (issue #105)', () => {
  it('mostra o rotulo "Enviado pelo aparelho" no balão', () => {
    render(<MessageBubble {...baseBubble(deviceMsg)} />);
    expect(screen.getByText('Enviado pelo aparelho')).toBeInTheDocument();
  });

  it('nao mostra o rotulo em mensagens normais do atendente', () => {
    render(
      <MessageBubble
        {...baseBubble({ ...deviceMsg, sentFromDevice: false })}
      />
    );
    expect(screen.queryByText('Enviado pelo aparelho')).not.toBeInTheDocument();
  });

  it('nao mostra o rotulo em mensagem apagada', () => {
    render(
      <MessageBubble
        {...baseBubble({ ...deviceMsg, deleted: true })}
      />
    );
    expect(screen.queryByText('Enviado pelo aparelho')).not.toBeInTheDocument();
  });

  it('toChatMessage mapeia sent_from_device para sentFromDevice', () => {
    const row: Message = {
      id: 'm2',
      tenant_id: 't1',
      conversation_id: 'c1',
      contact_phone: '5515999999999',
      content: 'Mensagem do celular',
      direction: 'outbound',
      read: true,
      sender_type: 'attendant',
      sent_from_device: true,
      created_at: '2026-11-05T12:00:00.000Z',
    };

    const chat = toChatMessage(row);
    expect(chat.from).toBe('attendant');
    expect(chat.sentFromDevice).toBe(true);
    expect(chat.text).toBe('Mensagem do celular');
  });

  it('toChatMessage marca false quando a mensagem nao veio do aparelho', () => {
    const row: Message = {
      id: 'm3',
      tenant_id: 't1',
      conversation_id: 'c1',
      contact_phone: '5515999999999',
      content: 'Enviada pelo sistema',
      direction: 'outbound',
      read: true,
      sender_type: 'attendant',
      created_at: '2026-11-05T12:00:00.000Z',
    };

    expect(toChatMessage(row).sentFromDevice).toBe(false);
  });
});

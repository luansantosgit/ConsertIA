import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChatReminderModal } from '@/pages/attendance/ChatReminderModal';
import { ReminderListModal } from '@/pages/attendance/ReminderListModal';

const reminders = [
  { id: 'r1', message: 'Orçamento aprovado', scheduled_at: '2026-12-01T10:00:00Z', status: 'sent' },
  { id: 'r2', message: 'Lembrete de retirada', scheduled_at: '2026-12-05T15:00:00Z', status: 'pending' },
];

vi.mock('@/repositories/chat-reminder.repository', () => ({
  ChatReminderRepository: class {
    getByConversation = async () => reminders;
    update = async () => {};
    delete = async () => {};
  },
}));

const conversation = {
  id: 'c1',
  contactName: 'Cliente Teste',
  contact_phone: '55159968411233',
} as never;

describe('Lembretes no modo dark', () => {
  it('a caixa do contato usa o token --bg-secondary (sem branco fixo)', () => {
    const { container } = render(
      <ChatReminderModal
        open
        conversation={conversation}
        editing={null}
        onClose={() => {}}
        onSave={async () => {}}
      />
    );

    const box = container.querySelector('[style*="--bg-secondary"]');
    expect(box).not.toBeNull();
    const style = box!.getAttribute('style') || '';
    expect(style).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it('a lista usa tokens de tema (enviado/pendente) em vez de verdes fixos', async () => {
    const { container } = render(
      <ReminderListModal open conversation={conversation} onClose={() => {}} />
    );

    await waitFor(() => expect(screen.getByText('Orçamento aprovado')).toBeInTheDocument());

    const styles = Array.from(container.querySelectorAll('div'))
      .map((el) => el.getAttribute('style') || '')
      .filter((style) => style.includes('success-bg') || style.includes('--bg-secondary'));

    expect(styles.length).toBeGreaterThan(0);
    expect(styles.join(' ')).toContain('var(--success-bg)');
    expect(styles.join(' ')).toContain('var(--bg-secondary)');
    // verde/claro fixo quebraria o dark (#f0fdf4, #ecfdf5, #bbf7d0, #16a34a)
    expect(styles.join(' ')).not.toMatch(/#[0-9a-f]{3,6}/i);
  });
});

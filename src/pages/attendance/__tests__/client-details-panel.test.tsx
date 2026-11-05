import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClientDetailsPanel } from '../ClientDetailsPanel';
import type { ConvRow } from '../types';

/**
 * Issue #105 — as "Ações Rápidas de IA" eram apenas MOCKADAS (o botão só
 * preenchia o input com o texto da ação). Foram removidas do painel do
 * contato (desktop e mobile).
 */
const conversation = {
  id: 'c1',
  contactName: 'Cliente Teste',
  contact_phone: '5515999999999',
  deviceInfo: 'iPhone 14 Pro',
  notes: '',
} as ConvRow;

const renderPanel = (variant: 'desktop' | 'mobile' = 'desktop') =>
  render(
    <MemoryRouter>
      <ClientDetailsPanel
        variant={variant}
        selected={conversation}
        currentClientOSList={[]}
        isEditingClient={false}
        editForm={{ contactName: '', contact_phone: '', deviceInfo: '', notes: '' }}
        onStartEdit={() => {}}
        onSaveClient={() => {}}
        onEditFormChange={() => {}}
        onOpenOSModal={() => {}}
        onViewPdfOS={() => {}}
        onSendOSCardToChat={() => {}}
        onClose={() => {}}
      />
    </MemoryRouter>
  );

describe('Painel do contato — ações de IA removidas (issue #105)', () => {
  it('não mostra o bloco "Ações Rápidas de IA" no desktop', () => {
    renderPanel('desktop');
    expect(screen.queryByText('Ações Rápidas de IA')).not.toBeInTheDocument();
    expect(screen.queryByText('Gerar orçamento automático')).not.toBeInTheDocument();
    expect(screen.queryByText('Notificar cliente via WhatsApp')).not.toBeInTheDocument();
    expect(screen.queryByText('Marcar OS como urgente')).not.toBeInTheDocument();
  });

  it('não mostra o bloco "Ações Rápidas de IA" no mobile', () => {
    renderPanel('mobile');
    expect(screen.queryByText('Ações Rápidas de IA')).not.toBeInTheDocument();
    expect(screen.queryByText('Gerar orçamento automático')).not.toBeInTheDocument();
  });

  it('mantém o restante do painel (dados do contato e OS)', () => {
    renderPanel('desktop');
    expect(screen.getByText('Detalhes')).toBeInTheDocument();
    expect(screen.getByText('Cliente Teste')).toBeInTheDocument();
    expect(screen.getByText(/Ordens de Serviço/)).toBeInTheDocument();
  });
});

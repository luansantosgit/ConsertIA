import React from 'react';
import { ClientDetailsPanel } from '../ClientDetailsPanel';
import type { MobileLayoutConfig } from './types';

/**
 * Tela 3 do modo mobile: detalhes do cliente em bottom sheet
 * (o painel de 330px do desktop vira um gaveta deslizante).
 */
export const MobileClientSheet: React.FC<MobileLayoutConfig> = ({ m }) => {
  const { selected, isRightPanelOpen, setIsRightPanelOpen } = m;
  if (!isRightPanelOpen || !selected) return null;

  const close = () => setIsRightPanelOpen(false);

  return (
    <div className="m-sheet-overlay" onClick={close}>
      <div
        className="m-sheet"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes do cliente"
      >
        <div className="m-sheet-handle" />
        <ClientDetailsPanel
          variant="mobile"
          selected={selected}
          currentClientOSList={m.currentClientOSList}
          isEditingClient={m.isEditingClient}
          editForm={m.editForm}
          onStartEdit={m.handleStartEditClient}
          onSaveClient={m.handleSaveClient}
          onEditFormChange={m.setEditForm}
          onOpenOSModal={() => m.setIsOSModalOpen(true)}
          onViewPdfOS={m.setViewingPdfOS}
          onSendOSCardToChat={m.handleSendOSCardToChat}
          onSetInputText={m.setInputText}
          onClose={close}
          onDelete={() => m.setConfirmDeleteConv({ isOpen: true, convId: selected.id, convName: selected.contactName })}
        />
      </div>
    </div>
  );
};

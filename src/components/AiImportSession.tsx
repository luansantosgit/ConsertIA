import React from 'react';
import { useAiImportStore } from '@/stores/ai-import.store';
import { ImportProductsModal } from '@/pages/inventory/ImportProductsModal';
import { AiImportBalloon } from '@/components/AiImportBalloon';

/**
 * Sessão global de importação com IA: modal OU balão flutuante.
 * O processo vive no store — sobrevive minimizar e navegar entre páginas.
 */
export const AiImportSession: React.FC = () => {
  const { modalOpen, minimized, closeModal } = useAiImportStore();
  const show = modalOpen && !minimized;

  if (show) {
    return (
      <ImportProductsModal
        onClose={closeModal}
        onImported={() => window.dispatchEvent(new CustomEvent('inventory-imported'))}
      />
    );
  }
  return <AiImportBalloon />;
};

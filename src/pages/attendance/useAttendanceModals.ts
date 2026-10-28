import { useState } from 'react';
import { useAttendance } from './useAttendance';
import type { ConvRow } from './types';

/**
 * useAttendance + estados dos modais compartilhados + lógica de
 * assumir/devolver atendimento de IA (usada pelos cards da lista e
 * pelo painel de detalhes). Um único ponto para desktop e mobile.
 */
export function useAttendanceModals() {
  const attendance = useAttendance();

  const [confirmDeleteConv, setConfirmDeleteConv] = useState<{ isOpen: boolean; convId: string; convName: string }>({
    isOpen: false, convId: '', convName: '',
  });
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [pendingCaption, setPendingCaption] = useState<string | undefined>(undefined);
  const [confirmClaimAi, setConfirmClaimAi] = useState<{ isOpen: boolean; convId: string; convName: string; aiState?: string }>({
    isOpen: false, convId: '', convName: '', aiState: undefined,
  });
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const { conversations, handleSelectConv, handleClaimAi, handleReleaseAi } = attendance;

  const executeAiToggle = (convId: string, aiState?: string) => {
    // IA pausada por humano OU já transferida pela IA (check verde): devolver ao agente.
    // Só "assumir" quando a IA está atendendo e o humano decide intervir.
    if (aiState === 'paused' || aiState === 'handed_off') {
      void handleReleaseAi(convId);
    } else {
      const conv = conversations.find(c => c.id === convId);
      if (conv) handleSelectConv(conv);
      void handleClaimAi(convId).catch(() => {});
    }
  };

  const handleAiIconClick = (conv: ConvRow) => {
    if (window.localStorage.getItem('deeperia:skip-ai-takeover-modal') === '1') {
      executeAiToggle(conv.id, conv.ai_state);
      return;
    }
    setDontShowAgain(false);
    setConfirmClaimAi({ isOpen: true, convId: conv.id, convName: conv.contactName, aiState: conv.ai_state });
  };

  return {
    ...attendance,
    confirmDeleteConv,
    setConfirmDeleteConv,
    pendingFiles,
    setPendingFiles,
    pendingCaption,
    setPendingCaption,
    confirmClaimAi,
    setConfirmClaimAi,
    dontShowAgain,
    setDontShowAgain,
    executeAiToggle,
    handleAiIconClick,
  };
}

export type AttendanceModalsState = ReturnType<typeof useAttendanceModals>;

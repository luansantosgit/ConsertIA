import React from 'react';
import { FileText, X } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import type { OSRow } from '@/components/OSModal';

// Lista das OSs do cliente para envio rápido pelo chat ("/" → Enviar OS).
// Ao selecionar uma OS, a lista fecha e só o ConfirmModal fica visível —
// evita z-index conflitante com dois modais sobrepostos.
export const OSPickerModal: React.FC<{
  open: boolean;
  osList: OSRow[];
  onClose: () => void;
  onSendOS: (os: OSRow) => void;
}> = ({ open, osList, onClose, onSendOS }) => {
  const [confirmOS, setConfirmOS] = React.useState<OSRow | null>(null);

  if (!open) return null;

  // Confirm ativo: só mostra o ConfirmModal (a lista fica escondida)
  if (confirmOS) {
    return (
      <ConfirmModal
        isOpen
        title="Confirmar envio"
        message={`Enviar a OS #${confirmOS.id.slice(0, 8)} com os detalhes para o cliente?`}
        variant="info"
        onConfirm={() => {
          onSendOS(confirmOS);
          setConfirmOS(null);
          onClose();
        }}
        onClose={() => setConfirmOS(null)}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3 className="modal-title">Enviar Ordem de Serviço</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {osList.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: 16 }}>
              Nenhuma OS cadastrada para este cliente.
            </p>
          ) : (
            osList.map(os => (
              <button
                key={os.id}
                className="btn btn-secondary"
                onClick={() => setConfirmOS(os)}
                style={{ justifyContent: 'space-between', padding: '12px 14px', fontSize: '0.8125rem' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={15} />
                  <span style={{ textAlign: 'left' }}>
                    <strong>#{os.id.slice(0, 8)}</strong> · {os.subject}
                    <br />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {os.equipmentLabel ?? '—'} · R$ {os.budget_amount ?? 0} · {os.status}
                    </span>
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';

interface ClientEditFormProps {
  editForm: { contactName: string; contact_phone: string; deviceInfo: string; notes: string };
  onFormChange: (form: { contactName: string; contact_phone: string; deviceInfo: string; notes: string }) => void;
}

export const ClientEditForm: React.FC<ClientEditFormProps> = ({
  editForm,
  onFormChange,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc', padding: 12, borderRadius: 10 }}>
      <div>
        <label className="form-label" style={{ fontSize: '0.75rem' }}>Nome do Cliente</label>
        <input
          className="input"
          style={{ fontSize: '0.8125rem', padding: '6px 10px' }}
          value={editForm.contactName}
          onChange={e => onFormChange({ ...editForm, contactName: e.target.value })}
        />
      </div>
      <div>
        <label className="form-label" style={{ fontSize: '0.75rem' }}>Telefone / WhatsApp</label>
        <input
          className="input"
          style={{ fontSize: '0.8125rem', padding: '6px 10px' }}
          value={editForm.contact_phone}
          onChange={e => onFormChange({ ...editForm, contact_phone: e.target.value })}
        />
      </div>
    </div>
  );
};
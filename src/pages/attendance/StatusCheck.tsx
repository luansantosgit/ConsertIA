import React from 'react';

export const StatusCheck: React.FC<{ status?: string }> = ({ status }) => {
  if (status === 'error') {
    return (
      <svg width="16" height="11" viewBox="0 0 16 11" style={{ color: '#ef4444' }}>
        <circle cx="5.5" cy="5.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <line x1="3" y1="3" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2" />
        <line x1="8" y1="3" x2="3" y2="8" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  // Enquanto está enviando (pending): exibe 1 tracinho de check (✓)
  if (status === 'pending') {
    return (
      <svg width="16" height="11" viewBox="0 0 16 11" style={{ opacity: 0.7 }}>
        <polyline
          points="1,5.5 4.5,9 11,2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  // Quando envia de fato ('sent', 'delivered', 'read'): exibe o segundo tracinho (✓✓)
  const color = status === 'read' ? '#53bdeb' : 'currentColor';
  return (
    <svg width="18" height="11" viewBox="0 0 18 11" style={{ color }}>
      <polyline points="1,5.5 4.5,9 11,2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="5,5.5 8.5,9 15,2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

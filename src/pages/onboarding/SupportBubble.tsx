import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** Mensagem pré-programada por estágio do wizard (diz onde o usuário está). */
const STEP_MESSAGES: Record<string, string> = {
  welcome: 'Olá! Estou começando o cadastro no DeeperIA e tenho uma dúvida.',
  data: 'Olá! Estou preenchendo meus dados no cadastro do DeeperIA e preciso de ajuda.',
  plan: 'Olá! Estou escolhendo o plano no cadastro do DeeperIA.',
  whatsapp: 'Olá! Estou conectando meu WhatsApp no cadastro do DeeperIA.',
  payment: 'Olá! Estou na etapa de pagamento do cadastro do DeeperIA.',
  success: 'Olá! Concluí o cadastro no DeeperIA e tenho uma dúvida.',
};

/**
 * Balão flutuante de suporte no wizard /comece-agora.
 * Redireciona ao WhatsApp do suporte (superadmin configura o número em
 * platform_settings.support_whatsapp, lido pela edge function public-signup).
 * Escondido enquanto o número não estiver configurado.
 */
export const SupportBubble: React.FC<{ step: string }> = ({ step }) => {
  const [whatsapp, setWhatsapp] = useState<string | null>(null);

  useEffect(() => {
    supabase.functions
      .invoke('public-signup', { body: { action: 'support' } })
      .then(({ data, error }) => {
        const num = String((data as { support_whatsapp?: string } | null)?.support_whatsapp ?? '').replace(/\D+/g, '');
        if (!error && num) setWhatsapp(num);
      })
      .catch(() => { /* sem suporte configurado: esconde */ });
  }, []);

  if (!whatsapp) return null;

  const message = STEP_MESSAGES[step] ?? STEP_MESSAGES.welcome;
  const href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;

  return (
    <a
      className="onb-support"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com o suporte no WhatsApp"
      title="Dúvida? Fale com o suporte no WhatsApp"
    >
      {/* Logotipo oficial do WhatsApp (ícone convidado Inline SVG) */}
      <svg viewBox="0 0 32 32" width="26" height="26" fill="#fff" aria-hidden="true">
        <path d="M16 .8C7.6.8.8 7.6.8 16c0 2.7.7 5.3 2 7.6L.8 31.2l7.8-2c2.2 1.2 4.7 1.9 7.4 1.9 8.4 0 15.2-6.8 15.2-15.2S24.4.8 16 .8zm0 27.6c-2.4 0-4.6-.6-6.6-1.8l-.5-.3-4.6 1.2 1.2-4.5-.3-.5c-1.3-2-1.9-4.2-1.9-6.5C3.3 9 8.9 3.4 16 3.4S28.7 9 28.7 16.1 23.1 28.4 16 28.4zm7-9.4c-.4-.2-2.3-1.1-2.6-1.3-.4-.1-.6-.2-.9.2s-1 1.3-1.3 1.6c-.2.2-.5.3-.9.1-2.4-1.2-4-2.2-5.5-4.9-.4-.7.4-.7 1.2-2.3.1-.3 0-.5-.1-.7s-.9-2.1-1.2-2.9c-.3-.8-.6-.7-.9-.7h-.8c-.3 0-.7.1-1.1.5-1.6 1.6-1.1 3.8.1 5.7 2.2 3.7 3.9 5.2 7.5 7.2 2.8 1.5 3.7 1.3 4.9 1.2.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.7.2-1.8-.1-.2-.3-.2-.7-.4z" />
      </svg>
    </a>
  );
};

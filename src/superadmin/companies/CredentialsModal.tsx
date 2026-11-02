import React from 'react';
import {
  CredentialsModal as SharedCredentialsModal,
  type CredentialsModalConfig,
} from '@/components/CredentialsModal';
import type { Credentials } from './types';

interface Props {
  credentials: Credentials | null;
  onClose: () => void;
}

const TITLES: Record<Credentials['kind'], string> = {
  created: 'Empresa criada! 🎉',
  reset: 'Senha regerada! 🔑',
  finalized: 'Cadastro finalizado! 🎉',
};

const SUCCESS_MESSAGES: Record<Credentials['kind'], (company: string) => string> = {
  created: (company) => `${company} foi criada e salva com sucesso.`,
  reset: (company) => `Nova senha gerada para o administrador de ${company}.`,
  finalized: (company) => `Cadastro de ${company} finalizado com sucesso.`,
};

const HINTS: Record<Credentials['kind'], string> = {
  created: 'Compartilhe as informações abaixo com o administrador da empresa para o primeiro acesso:',
  reset: 'A senha anterior deixa de funcionar. Compartilhe os novos dados de acesso:',
  finalized: 'O pagamento foi confirmado e a empresa foi ativada. Envie estes dados de acesso ao cliente:',
};

/** Modal de credenciais do painel superadmin (empresas). */
export const CredentialsModal: React.FC<Props> = ({ credentials, onClose }) => {
  if (!credentials) return null;

  const config: CredentialsModalConfig = {
    title: TITLES[credentials.kind],
    successMessage: SUCCESS_MESSAGES[credentials.kind](credentials.company),
    hint: HINTS[credentials.kind],
    passwordLabel: credentials.kind === 'reset' ? 'Nova senha' : 'Senha (gerada automaticamente)',
  };

  return (
    <SharedCredentialsModal
      credentials={{ email: credentials.email, password: credentials.password }}
      config={config}
      onClose={onClose}
    />
  );
};

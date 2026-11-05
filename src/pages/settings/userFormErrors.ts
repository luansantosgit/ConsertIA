/** Opcoes de perfil disponiveis na criacao/edicao de usuario. */
export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gerente' },
  { value: 'technician', label: 'Técnico' },
  { value: 'attendant', label: 'Atendente' },
];

type UserFormError = Error & { code?: string; maxUsers?: number };

/** Converte o erro do repositorio/edge em uma mensagem amigavel. */
export function errorToMessage(err: UserFormError): string {
  switch (err.code) {
    case 'limit_reached':
      return `Limite de usuários do plano atingido (${err.maxUsers ?? 0}). Faça upgrade para adicionar mais.`;
    case 'email_exists':
      return 'Este e-mail já está cadastrado.';
    case 'weak_password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'invalid_data':
      return 'Preencha nome e um e-mail válido.';
    case 'invalid_role':
      return 'Perfil inválido.';
    case 'not_found':
      return 'Usuário não encontrado.';
    case 'forbidden':
      return 'Você não tem permissão para alterar este usuário.';
    default:
      return 'Erro ao salvar usuário. Tente novamente.';
  }
}

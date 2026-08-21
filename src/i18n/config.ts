import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const resources = {
  'pt-BR': {
    translation: {
      // Navegação
      'Dashboard': 'Dashboard',
      'Atendimento': 'Atendimento',
      'Ordens de Serviço': 'Ordens de Serviço',
      'Clientes': 'Clientes',
      'Estoque': 'Estoque',
      'Financeiro': 'Financeiro',
      'Agenda': 'Agenda',
      'Relatórios': 'Relatórios',
      'Configurações': 'Configurações',
      
      // Ações
      'Salvar': 'Salvar',
      'Cancelar': 'Cancelar',
      'Excluir': 'Excluir',
      'Editar': 'Editar',
      'Novo': 'Novo',
      'Buscar': 'Buscar',
      'Filtrar': 'Filtrar',
      'Exportar': 'Exportar',
      'Importar': 'Importar',
      
      // Status
      'Ativo': 'Ativo',
      'Inativo': 'Inativo',
      'Pendente': 'Pendente',
      'Em Andamento': 'Em Andamento',
      'Concluído': 'Concluído',
      'Cancelado': 'Cancelado',
      'Aguardando Aprovação': 'Aguardando Aprovação',
      'Aguardando Peça': 'Aguardando Peça',
      'Pronto': 'Pronto',
      
      // Mensagens
      'Bem-vindo': 'Bem-vindo',
      'Carregando...': 'Carregando...',
      'Nenhum registro encontrado': 'Nenhum registro encontrado',
      'Registro salvo com sucesso': 'Registro salvo com sucesso',
      'Erro ao salvar registro': 'Erro ao salvar registro',
      'Tem certeza que deseja excluir?': 'Tem certeza que deseja excluir?',
      
      // Placeholders
      'Digite para buscar...': 'Digite para buscar...',
      'Selecione uma opção': 'Selecione uma opção',
      
      // Labels comuns
      'Nome': 'Nome',
      'Email': 'Email',
      'Telefone': 'Telefone',
      'Celular': 'Celular',
      'CPF': 'CPF',
      'CNPJ': 'CNPJ',
      'Endereço': 'Endereço',
      'Cidade': 'Cidade',
      'Estado': 'Estado',
      'CEP': 'CEP',
      'Data': 'Data',
      'Hora': 'Hora',
      'Descrição': 'Descrição',
      'Observações': 'Observações',
      'Valor': 'Valor',
      'Status': 'Status',
      'Ações': 'Ações',
    }
  },
  'en': {
    translation: {
      // Navigation
      'Dashboard': 'Dashboard',
      'Atendimento': 'Service',
      'Ordens de Serviço': 'Service Orders',
      'Clientes': 'Customers',
      'Estoque': 'Inventory',
      'Financeiro': 'Financial',
      'Agenda': 'Schedule',
      'Relatórios': 'Reports',
      'Configurações': 'Settings',
      
      // Actions
      'Salvar': 'Save',
      'Cancelar': 'Cancel',
      'Excluir': 'Delete',
      'Editar': 'Edit',
      'Novo': 'New',
      'Buscar': 'Search',
      'Filtrar': 'Filter',
      'Exportar': 'Export',
      'Importar': 'Import',
      
      // Status
      'Ativo': 'Active',
      'Inativo': 'Inactive',
      'Pendente': 'Pending',
      'Em Andamento': 'In Progress',
      'Concluído': 'Completed',
      'Cancelado': 'Cancelled',
      'Aguardando Aprovação': 'Awaiting Approval',
      'Aguardando Peça': 'Awaiting Part',
      'Pronto': 'Ready',
      
      // Messages
      'Bem-vindo': 'Welcome',
      'Carregando...': 'Loading...',
      'Nenhum registro encontrado': 'No records found',
      'Registro salvo com sucesso': 'Record saved successfully',
      'Erro ao salvar registro': 'Error saving record',
      'Tem certeza que deseja excluir?': 'Are you sure you want to delete?',
      
      // Placeholders
      'Digite para buscar...': 'Type to search...',
      'Selecione uma opção': 'Select an option',
      
      // Common labels
      'Nome': 'Name',
      'Email': 'Email',
      'Telefone': 'Phone',
      'Celular': 'Mobile',
      'CPF': 'Individual ID',
      'CNPJ': 'Company ID',
      'Endereço': 'Address',
      'Cidade': 'City',
      'Estado': 'State',
      'CEP': 'ZIP Code',
      'Data': 'Date',
      'Hora': 'Time',
      'Descrição': 'Description',
      'Observações': 'Notes',
      'Valor': 'Amount',
      'Status': 'Status',
      'Ações': 'Actions',
    }
  },
  'es': {
    translation: {
      // Navegación
      'Dashboard': 'Panel de Control',
      'Atendimento': 'Atención',
      'Ordens de Serviço': 'Órdenes de Servicio',
      'Clientes': 'Clientes',
      'Estoque': 'Inventario',
      'Financeiro': 'Financiero',
      'Agenda': 'Agenda',
      'Relatórios': 'Informes',
      'Configurações': 'Configuraciones',
      
      // Acciones
      'Salvar': 'Guardar',
      'Cancelar': 'Cancelar',
      'Excluir': 'Eliminar',
      'Editar': 'Editar',
      'Novo': 'Nuevo',
      'Buscar': 'Buscar',
      'Filtrar': 'Filtrar',
      'Exportar': 'Exportar',
      'Importar': 'Importar',
      
      // Estados
      'Ativo': 'Activo',
      'Inativo': 'Inactivo',
      'Pendente': 'Pendiente',
      'Em Andamento': 'En Progreso',
      'Concluído': 'Completado',
      'Cancelado': 'Cancelado',
      'Aguardando Aprovação': 'Esperando Aprobación',
      'Aguardando Peça': 'Esperando Pieza',
      'Pronto': 'Listo',
      
      // Mensajes
      'Bem-vindo': 'Bienvenido',
      'Carregando...': 'Cargando...',
      'Nenhum registro encontrado': 'No se encontraron registros',
      'Registro salvo com sucesso': 'Registro guardado con éxito',
      'Erro ao salvar registro': 'Error al guardar registro',
      'Tem certeza que deseja excluir?': '¿Está seguro de que desea eliminar?',
      
      // Placeholders
      'Digite para buscar...': 'Escriba para buscar...',
      'Selecione uma opção': 'Seleccione una opción',
      
      // Etiquetas comunes
      'Nome': 'Nombre',
      'Email': 'Correo',
      'Telefone': 'Teléfono',
      'Celular': 'Móvil',
      'CPF': 'ID Individual',
      'CNPJ': 'ID Empresa',
      'Endereço': 'Dirección',
      'Cidade': 'Ciudad',
      'Estado': 'Estado',
      'CEP': 'Código Postal',
      'Data': 'Fecha',
      'Hora': 'Hora',
      'Descrição': 'Descripción',
      'Observações': 'Notas',
      'Valor': 'Valor',
      'Status': 'Estado',
      'Ações': 'Acciones',
    }
  }
} as const;

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt-BR',
    fallbackLng: 'pt-BR',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

export interface OSDocLabels {
  title: string;
  subtitle: string;
  print: string;
  sendChat: string;
  emissionDate: string;
  status: string;
  customerData: string;
  phone: string;
  customerId: string;
  deviceData: string;
  technician: string;
  priority: string;
  problemReported: string;
  defaultDescription: string;
  breakdownTitle: string;
  item: string;
  qty: string;
  value: string;
  partRow: string;
  partFallback: string;
  laborRow: string;
  laborDesc: string;
  serviceRow: string;
  toDefine: string;
  total: string;
  termsLabel: string;
  defaultTerms: string;
  customerSignature: string;
  techSignature: string;
  readyFooter: string;
  close: string;
}

const ptBR: OSDocLabels = {
  title: 'Ordem de Serviço & Orçamento',
  subtitle: 'Documento gerado para impressão e envio ao cliente',
  print: 'Imprimir / Salvar PDF',
  sendChat: 'Enviar no Chat (1 Clique)',
  emissionDate: 'Data de Emissão',
  status: 'Status',
  customerData: 'Dados do Cliente',
  phone: 'Telefone',
  customerId: 'ID Cliente',
  deviceData: 'Dados do Aparelho',
  technician: 'Técnico Responsável',
  priority: 'Prioridade',
  problemReported: 'Problema Declarado / Laudo de Entrada',
  defaultDescription: 'Equipamento recebido para triagem técnica e teste de bancada.',
  breakdownTitle: 'Discriminação dos Serviços e Peças',
  item: 'Item / Descrição',
  qty: 'Qtd',
  value: 'Valor',
  partRow: 'Peça / Componente',
  partFallback: 'Conforme orçamento aprovado',
  laborRow: 'Mão de Obra',
  laborDesc: 'Serviço técnico executado',
  serviceRow: 'Serviço & Peças',
  toDefine: 'A definir',
  total: 'Total do Orçamento',
  termsLabel: 'Termos de Serviço',
  defaultTerms: 'Este documento não representa obrigação de serviço até a aprovação do orçamento pelo cliente. Em caso de dúvidas, entre em contato conosco.',
  customerSignature: 'Assinatura do Cliente',
  techSignature: 'Técnico Responsável',
  readyFooter: 'Documento pronto para envio ou impressão A4.',
  close: 'Fechar',
};

const en: OSDocLabels = {
  ...ptBR,
  title: 'Service Order & Quote',
  subtitle: 'Document generated for printing and sending to the customer',
  print: 'Print / Save PDF',
  sendChat: 'Send in Chat (1 Click)',
  emissionDate: 'Issue Date',
  status: 'Status',
  customerData: 'Customer Information',
  phone: 'Phone',
  customerId: 'Customer ID',
  deviceData: 'Device Information',
  technician: 'Responsible Technician',
  priority: 'Priority',
  problemReported: 'Reported Problem / Intake Report',
  defaultDescription: 'Device received for technical inspection and bench testing.',
  breakdownTitle: 'Services and Parts Breakdown',
  item: 'Item / Description',
  qty: 'Qty',
  value: 'Amount',
  partRow: 'Part / Component',
  partFallback: 'As per approved quote',
  laborRow: 'Labor',
  laborDesc: 'Technical service performed',
  serviceRow: 'Service & Parts',
  toDefine: 'To be defined',
  total: 'Quote Total',
  termsLabel: 'Service Terms',
  defaultTerms: 'This document does not represent a service commitment until the quote is approved by the customer. If you have questions, please contact us.',
  customerSignature: 'Customer Signature',
  techSignature: 'Responsible Technician',
  readyFooter: 'Document ready to send or print on A4.',
  close: 'Close',
};

const es: OSDocLabels = {
  ...ptBR,
  title: 'Orden de Servicio y Presupuesto',
  subtitle: 'Documento generado para impresión y envío al cliente',
  print: 'Imprimir / Guardar PDF',
  sendChat: 'Enviar en el Chat (1 Clic)',
  emissionDate: 'Fecha de Emisión',
  status: 'Estado',
  customerData: 'Datos del Cliente',
  phone: 'Teléfono',
  customerId: 'ID del Cliente',
  deviceData: 'Datos del Aparato',
  technician: 'Técnico Responsable',
  priority: 'Prioridad',
  problemReported: 'Problema Declarado / Informe de Entrada',
  defaultDescription: 'Equipo recibido para inspección técnica y prueba de banco.',
  breakdownTitle: 'Desglose de Servicios y Piezas',
  item: 'Ítem / Descripción',
  qty: 'Cant',
  value: 'Valor',
  partRow: 'Pieza / Componente',
  partFallback: 'Conforme presupuesto aprobado',
  laborRow: 'Mano de Obra',
  laborDesc: 'Servicio técnico ejecutado',
  serviceRow: 'Servicio y Piezas',
  toDefine: 'A definir',
  total: 'Total del Presupuesto',
  termsLabel: 'Términos de Servicio',
  defaultTerms: 'Este documento no representa un compromiso de servicio hasta que el cliente apruebe el presupuesto. Si tiene dudas, contáctenos.',
  customerSignature: 'Firma del Cliente',
  techSignature: 'Técnico Responsable',
  readyFooter: 'Documento listo para enviar o imprimir en A4.',
  close: 'Cerrar',
};

export function osDocLabels(language: string | undefined): OSDocLabels {
  if (language === 'en') return en;
  if (language === 'es') return es;
  return ptBR;
}

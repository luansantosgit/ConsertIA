import { supabase } from '@/lib/supabase';
import type { QuickReply, QuickReplyPart } from '@/repositories/quick-reply.repository';

// Respostas rápidas de SISTEMA — dinâmicas, sempre lidas do cadastro
// real da empresa (tenant_settings). Não são registros: se o endereço
// ou o horário mudarem em Configurações, o chat já usa o valor novo.

const DAYS: { key: string; label: string }[] = [
  { key: '1', label: 'Segunda' },
  { key: '2', label: 'Terça' },
  { key: '3', label: 'Quarta' },
  { key: '4', label: 'Quinta' },
  { key: '5', label: 'Sexta' },
  { key: '6', label: 'Sábado' },
  { key: '0', label: 'Domingo' },
];

function hoursText(bh: Record<string, { open?: boolean; start?: string; end?: string }> | null): string {
  const segs = DAYS.map(({ key, label }) => {
    const d = bh?.[key];
    const open = d?.open ?? (key !== '0');
    const start = d?.start ?? '08:00';
    const end = d?.end ?? (key === '6' ? '12:00' : '18:00');
    return open ? `${label} ${start} às ${end}` : `${label}: fechado`;
  });
  return `Horário de atendimento: ${segs.join(' · ')}`;
}

function systemReply(id: string, shortcut: string, title: string, text: string): QuickReply {
  return {
    id,
    tenant_id: '',
    shortcut,
    title,
    parts: text ? [{ type: 'text', text } as QuickReplyPart] : [],
    is_default: true,
    created_at: '',
    updated_at: '',
  };
}

export async function fetchSystemQuickReplies(tenantId: string): Promise<QuickReply[]> {
  const { data } = await supabase
    .from('tenant_settings')
    .select('company_name, address, phone, whatsapp, business_hours')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const addrBits = [
    data?.company_name,
    data?.address,
    data?.phone ? `Tel: ${data.phone}` : '',
    data?.whatsapp ? `WhatsApp: ${data.whatsapp}` : '',
  ].filter(Boolean);

  const replies = [
    systemReply('system-endereco', 'endereco', 'Endereço completo', addrBits.join(' | ')),
    systemReply(
      'system-horario',
      'horario',
      'Horário de atendimento',
      hoursText((data?.business_hours as Record<string, { open?: boolean; start?: string; end?: string }> | null) ?? null),
    ),
  ];
  // Só inclui as que têm conteúdo de verdade
  return replies.filter(r => r.parts.length > 0);
}

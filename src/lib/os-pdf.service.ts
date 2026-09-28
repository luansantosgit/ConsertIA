import { jsPDF } from 'jspdf';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { formatCurrency } from '@/lib/format';
import type { ServiceOrder } from '@/types';

const BUCKET = 'os-documents';

interface OsFull extends ServiceOrder {
  customer?: { name?: string; phone?: string; mobile?: string } | null;
  equipment?: { type?: string; brand?: string; model?: string } | null;
}

async function fetchOrder(osId: string): Promise<OsFull | null> {
  const tenantId = useAuthStore.getState().user?.tenantId || '';
  const { data, error } = await supabase
    .from('service_orders')
    .select('*, customer:customers(name, phone, mobile), equipment:equipment(type, brand, model)')
    .eq('id', osId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error || !data) return null;
  return data as OsFull;
}

function buildPdf(order: OsFull, companyName: string): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 16;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(companyName, margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Ordem de Serviço #${order.id.slice(0, 8).toUpperCase()}  ·  ${new Date(order.created_at).toLocaleDateString('pt-BR')}`, margin, y);
  y += 12;

  doc.setDrawColor(200);
  doc.line(margin, y - 4, 210 - margin, y - 4);

  const label = (t: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(t.toUpperCase(), margin, y);
  };
  const value = (t: string, x = margin + 42) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(t || '—', 210 - margin - x);
    doc.text(lines, x, y);
    return lines.length * 4.5;
  };

  const rows: Array<[string, string]> = [
    ['Cliente', order.customer?.name ?? ''],
    ['Telefone', order.customer?.phone ?? order.customer?.mobile ?? ''],
    ['Equipamento', [order.equipment?.brand, order.equipment?.model].filter(Boolean).join(' ') || order.equipment?.type || ''],
    ['Serviço', order.subject],
    ['Problema relatado', order.description ?? ''],
    ['Diagnóstico', order.diagnosis ?? '—'],
  ];
  for (const [l, v] of rows) {
    label(l);
    y += Math.max(value(v), 5) + 1.5;
  }

  y += 4;
  label('Orçamento');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (order.part_name) {
    doc.text(`Peça (${order.part_name}): ${formatCurrency(order.part_amount ?? 0)}`, margin + 42, y);
    y += 5.5;
    doc.text(`Mão de obra: ${formatCurrency(order.labor_amount ?? 0)}`, margin + 42, y);
    y += 5.5;
  }
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL: ${order.budget_amount != null ? formatCurrency(order.budget_amount) : '—'}`, margin + 42, y);
  y += 12;

  doc.setDrawColor(200);
  doc.line(margin, y, 210 - margin, y);
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('Documento gerado automaticamente pelo sistema.', margin, y);

  return doc.output('blob');
}

async function uploadPdf(orderId: string, blob: Blob): Promise<string | null> {
  const tenantId = useAuthStore.getState().user?.tenantId || '';
  const path = `${tenantId}/${orderId}.pdf`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'application/pdf', upsert: true });
  if (error) {
    console.error('[os-pdf] upload failed:', error.message);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Gera o PDF da OS, sobe no storage e envia ao lead pelo WhatsApp. Best-effort. */
export async function sendOsPdfToLead(osId: string, phone: string, caption: string): Promise<boolean> {
  try {
    const tenantId = useAuthStore.getState().user?.tenantId || '';
    const order = await fetchOrder(osId);
    if (!order) return false;

    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('company_name')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    const companyName = settings?.company_name || 'Assistência Técnica';

    const blob = buildPdf(order, companyName);
    const url = await uploadPdf(order.id, blob);
    if (!url) return false;

    const { data: conn } = await supabase
      .from('connections')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'connected')
      .limit(1)
      .maybeSingle();
    if (!conn) {
      console.warn('[os-pdf] sem conexão conectada — PDF não enviado');
      return false;
    }

    const { sendMediaMessage } = await import('@/lib/api-alternativa.service');
    const result = await sendMediaMessage(conn.id, phone, 'document', url, {
      caption,
      docName: `OS-${order.id.slice(0, 8).toUpperCase()}.pdf`,
      mimetype: 'application/pdf',
    });
    if (!result.success) {
      console.error('[os-pdf] send failed:', result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[os-pdf] failed:', err);
    return false;
  }
}

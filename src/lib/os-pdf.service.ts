import { jsPDF } from 'jspdf';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { formatCurrency } from '@/lib/format';
import type { ServiceOrder } from '@/types';

const BUCKET = 'os-documents';

interface OsFull extends ServiceOrder {
  customer?: { name?: string; phone?: string; mobile?: string } | null;
  equipment?: { type?: string; brand?: string; model?: string; serial_number?: string } | null;
  technicianName?: string;
}

interface CompanyInfo {
  company_name?: string | null;
  cnpj?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  address?: string | null;
  os_terms?: string | null;
}

interface ThemeInfo {
  logo_url?: string | null;
  primary_color?: string | null;
}

interface PdfLogoInfo {
  pdf_logo_url?: string | null;
}

const DEFAULT_TERMS =
  'Este documento não representa obrigação de serviço até a aprovação do orçamento pelo cliente. ' +
  'Em caso de dúvidas, entre em contato conosco.';

async function fetchOrder(osId: string): Promise<OsFull | null> {
  const tenantId = useAuthStore.getState().user?.tenantId || '';
  const { data, error } = await supabase
    .from('service_orders')
    .select('*, customer:customers(name, phone, mobile), equipment:equipment(type, brand, model, serial_number)')
    .eq('id', osId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error || !data) return null;
  return data as OsFull;
}

async function fetchCompanyAndTheme(): Promise<{ company: CompanyInfo; theme: ThemeInfo; pdfLogo: PdfLogoInfo }> {
  const tenantId = useAuthStore.getState().user?.tenantId || '';
  const [settingsRes, themeRes] = await Promise.all([
    supabase
      .from('tenant_settings')
      .select('company_name, cnpj, whatsapp, phone, address, os_terms, pdf_logo_url')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    supabase
      .from('tenant_themes')
      .select('logo_url, primary_color')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
  ]);
  return {
    company: settingsRes.data ?? {},
    theme: themeRes.data ?? {},
    pdfLogo: { pdf_logo_url: (settingsRes.data as PdfLogoInfo)?.pdf_logo_url ?? null },
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  if (m.length !== 6) return [79, 70, 229];
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
}

function formatOSCode(id: string): string {
  if (!id) return 'OS-??????';
  const clean = id.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `OS-${clean || '??????'}`;
}

/** Adiciona imagem no PDF a partir de dataUrl/URL (best-effort) */
function addLogo(doc: jsPDF, logoUrl: string | null, x: number, y: number, size: number): boolean {
  if (!logoUrl) return false;
  try {
    if (logoUrl.startsWith('data:image')) {
      const isPng = logoUrl.includes('image/png');
      const format = isPng ? 'PNG' : 'JPEG';
      doc.addImage(logoUrl, format, x, y, size, size);
      return true;
    }
    if (logoUrl.startsWith('http')) {
      doc.addImage(logoUrl, 'PNG', x, y, size, size);
      return true;
    }
  } catch {
    // fallback: usa a inicial
  }
  return false;
}

function buildPdf(order: OsFull, company: CompanyInfo, theme: ThemeInfo, pdfLogo: PdfLogoInfo, checklistPhotos: ChecklistPhotoPdf[] = []): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const M = 16;
  let y = M;

  const PRIMARY = theme.primary_color ? hexToRgb(theme.primary_color) : [79, 70, 229] as [number, number, number];
  const TEXT: [number, number, number] = [30, 41, 59];
  const MUTED: [number, number, number] = [100, 116, 139];
  const BORDER: [number, number, number] = [203, 213, 225];
  const BG: [number, number, number] = [248, 250, 252];

  const osCode = formatOSCode(order.id);
  const companyName = company.company_name || 'Assistência Técnica';

  // ── TÍTULO DO DOCUMENTO ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...PRIMARY);
  doc.text('Ordem de Serviço', W / 2, y + 8, { align: 'center' });
  y += 16;

  // Linha decorativa sob o título
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(W / 2 - 20, y, 40, 1.5, 0.5, 0.5, 'F');
  y += 8;

  // ── HEADER: EMPRESA + CÓDIGO ──
  const logoSize = 14;
  // Prioridade: pdf_logo_url (menu Empresa) > tenant_themes.logo_url (Aparência) > sigla
  const effectiveLogo = pdfLogo.pdf_logo_url ?? theme.logo_url ?? null;
  const logoPlaced = addLogo(doc, effectiveLogo, M + 2, y + 2, logoSize);

  if (logoPlaced) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...TEXT);
    doc.text(companyName, M + logoSize + 8, y + 7);
  } else {
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(M + 2, y + 2, logoSize, logoSize, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(companyName.charAt(0).toUpperCase(), M + 2 + logoSize / 2, y + 2 + logoSize / 2 + 1, { align: 'center' });
    doc.setTextColor(...TEXT);
    doc.setFontSize(11);
    doc.text(companyName, M + logoSize + 8, y + 7);
  }

  // CNPJ / contato / endereço
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  const contactBits = [
    company.cnpj ? `CNPJ: ${company.cnpj}` : '',
    (company.whatsapp || company.phone) ? `Tel: ${company.whatsapp || company.phone}` : '',
  ].filter(Boolean).join('  ·  ');
  if (contactBits) doc.text(contactBits, M + logoSize + 8, y + 12);
  if (company.address) doc.text(company.address, M + logoSize + 8, y + 16);

  // Código da OS (direita)
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(W - M - 46, y, 46, 9, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(osCode, W - M - 23, y + 6.5, { align: 'center' });

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Emissão: ${new Date(order.created_at).toLocaleDateString('pt-BR')}`, W - M, y + 13, { align: 'right' });
  const statusLabels: Record<string, string> = {
    pending: 'Pendente', diagnosis: 'Em diagnóstico',
    awaiting_approval: 'Aguardando aprovação', approved: 'Aprovada',
    awaiting_part: 'Aguardando peça', in_progress: 'Em andamento',
    completed: 'Concluída', ready: 'Pronta', cancelled: 'Cancelada',
  };
  doc.text(`Status: ${statusLabels[order.status] ?? order.status}`, W - M, y + 17, { align: 'right' });
  y += 24;

  // Linha divisória
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 8;

  // ── CARDS: CLIENTE + EQUIPAMENTO ──
  const cardW = (W - M * 2 - 6) / 2;
  const cardH = 34;

  const drawCard = (x: number, title: string, lines: Array<{ text: string; bold?: boolean; small?: boolean }>) => {
    doc.setFillColor(...BG);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(title.toUpperCase(), x + 6, y + 5);
    let ly = y + 11;
    for (const line of lines) {
      doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
      doc.setFontSize(line.small ? 7.5 : 9);
      doc.setTextColor(...(line.small ? MUTED : TEXT));
      doc.text(line.text, x + 6, ly);
      ly += line.small ? 4.5 : 5.5;
    }
  };

  drawCard(M, 'Dados do cliente', [
    { text: order.customer?.name ?? '—', bold: true },
    { text: `Telefone: ${order.customer?.phone ?? order.customer?.mobile ?? '—'}`, small: true },
  ]);

  const equipLabel = [order.equipment?.brand, order.equipment?.model].filter(Boolean).join(' ') || order.equipment?.type || '—';
  const deviceLines: Array<{ text: string; bold?: boolean; small?: boolean }> = [
    { text: equipLabel, bold: true },
    { text: `Técnico: ${order.technicianName || '—'}`, small: true },
    { text: `N° de Série: ${order.serial_number || order.equipment?.serial_number || '—'}`, small: true },
  ];
  drawCard(M + cardW + 6, 'Equipamento', deviceLines);
  y += cardH + 8;

  // ── PROBLEMA RELATADO ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text('PROBLEMA RELATADO', M, y);
  y += 4;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, W - M * 2, 18, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text(order.subject, M + 6, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const descLines = doc.splitTextToSize(order.description || '—', W - M * 2 - 12);
  doc.text(descLines.slice(0, 2), M + 6, y + 10.5);
  y += 24;

  // ── ORÇAMENTO ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text('ORÇAMENTO', M, y);
  y += 4;

  const colItem = M + 4;
  const colQty = W - M - 64;
  const colVal = W - M - 8;
  const rowH = 9;

  // Header
  doc.setFillColor(241, 245, 249);
  doc.rect(M, y, W - M * 2, rowH, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.line(M, y + rowH, W - M, y + rowH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Item', colItem, y + 6);
  doc.text('Qtd', colQty + 8, y + 6, { align: 'center' });
  doc.text('Valor', colVal, y + 6, { align: 'right' });
  y += rowH;

  const hasPart = order.part_amount != null && (order.part_amount as number) > 0;
  const hasLabor = order.labor_amount != null && (order.labor_amount as number) > 0;

  const addItemRow = (name: string, desc: string, qty: number, value: number | null) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(M, y + rowH, W - M, y + rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    doc.text(name, colItem, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(desc, colItem, y + 7.5);
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    doc.text(String(qty), colQty + 8, y + 5, { align: 'center' });
    doc.text(value != null ? formatCurrency(value) : 'A definir', colVal, y + 5, { align: 'right' });
    y += rowH;
  };

  const items = (order.budget_items ?? []) as Array<{ name: string; value: number }>;
  const hasItems = items.length > 0;

  if (hasItems) {
    for (const item of items) {
      if (!item.name) continue;
      addItemRow(item.name, '', 1, item.value || null);
    }
  } else {
    if (hasPart) addItemRow('Peça', order.part_name || 'Peça de reposição', 1, (order.part_amount as number) || null);
    if (hasLabor) addItemRow('Mão de obra', 'Serviço técnico especializado', 1, (order.labor_amount as number) || null);
    if (!hasPart && !hasLabor) addItemRow('Serviço', order.subject, 1, order.budget_amount ?? null);
  }

  // Total
  doc.setFillColor(...BG);
  doc.rect(M, y, W - M * 2, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text('TOTAL:', W - M - 40, y + 7);
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  const budget = order.budget_amount ?? 0;
  doc.text(budget > 0 ? formatCurrency(budget) : 'A definir', colVal, y + 7, { align: 'right' });
  y += 18;

  // ── FOTOS DO CHECKLIST (antes dos termos/assinaturas) ──
  const photosWithBase64 = checklistPhotos.filter(p => p.base64);
  if (photosWithBase64.length > 0) {
    doc.addPage();
    let py = M;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text('FOTOS DO CHECKLIST DE ENTRADA', M, py);
    py += 6;

    const photoW = (W - M * 2 - 8) / 2;
    const photoH = 70;
    let px = M;
    for (const photo of photosWithBase64) {
      try {
        const isPng = photo.base64!.includes('image/png');
        doc.addImage(photo.base64!, isPng ? 'PNG' : 'JPEG', px, py, photoW, photoH);
        if (photo.label) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(...MUTED);
          doc.text(photo.label, px + 2, py + photoH + 4);
        }
        if (px === M) {
          px = M + photoW + 8;
        } else {
          px = M;
          py += photoH + 18;
          if (py > H - 100) {
            doc.addPage();
            py = M;
          }
        }
      } catch {
        // pula foto que falhar
      }
    }
    // Termos e assinaturas ficam na página seguinte às fotos
    doc.addPage();
    y = M;
  }

  // ── TERMOS (parte final do documento, após as fotos) ──
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(M, y, W - M, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Termos de Serviço:', M, y);
  doc.setFont('helvetica', 'normal');
  const terms = company.os_terms?.trim() || DEFAULT_TERMS;
  const termLines = doc.splitTextToSize(terms, W - M * 2);
  doc.text(termLines.slice(0, 5), M, y + 4.5);
  y += Math.min(termLines.length, 5) * 3.5 + 10;

  // ── ASSINATURAS (final do documento) ──
  if (y < H - 28) {
    const sigW = (W - M * 2 - 40) / 2;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(M, y + 12, M + sigW, y + 12);
    doc.line(W - M - sigW, y + 12, W - M, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('Assinatura do cliente', M + sigW / 2, y + 16, { align: 'center' });
    doc.text(`${companyName} — Técnico`, W - M - sigW / 2, y + 16, { align: 'center' });
  }

  // ── RODAPÉ ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(
    `${companyName} · Documento gerado pelo sistema`,
    W / 2, H - 8, { align: 'center' },
  );

  return doc.output('blob');
}

interface ChecklistPhotoPdf {
  url: string;
  label?: string;
  base64?: string;
}

/** Baixa as fotos do checklist e converte para base64 (para o PDF) */
async function fetchPhotosAsBase64(photos: Array<{ url: string; label?: string }>): Promise<ChecklistPhotoPdf[]> {
  const results: ChecklistPhotoPdf[] = [];
  for (const photo of photos.slice(0, 6)) {
    try {
      const res = await fetch(photo.url);
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      results.push({ url: photo.url, label: photo.label, base64 });
    } catch {
      results.push({ url: photo.url, label: photo.label });
    }
  }
  return results;
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

export async function sendOsPdfToLead(osId: string, phone: string, caption: string): Promise<boolean> {
  try {
    const [order, { company, theme, pdfLogo }] = await Promise.all([
      fetchOrder(osId),
      fetchCompanyAndTheme(),
    ]);
    if (!order) return false;

    // Baixa as fotos do checklist para incluir no PDF
    const checklistPhotos = await fetchPhotosAsBase64(
      (order.checklist_photos ?? []) as Array<{ url: string; label?: string }>
    );

    const blob = buildPdf(order, company, theme, pdfLogo, checklistPhotos);
    const url = await uploadPdf(order.id, blob);
    if (!url) return false;

    const tenantId = useAuthStore.getState().user?.tenantId || '';
    const { data: conn } = await supabase
      .from('connections')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'connected')
      .limit(1)
      .maybeSingle();
    if (!conn) return false;

    const { sendMediaMessage } = await import('@/lib/api-alternativa.service');
    const result = await sendMediaMessage(conn.id, phone, 'document', url, {
      caption,
      docName: `${formatOSCode(order.id)}.pdf`,
      mimetype: 'application/pdf',
    });
    return result.success;
  } catch (err) {
    console.error('[os-pdf] failed:', err);
    return false;
  }
}

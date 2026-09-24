import type { AgentContext, PartRow, ToolResult } from "./types.ts";
import { isOpenAt, nextOpenDayText } from "./business-hours.ts";

export const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "find_part",
      description: "Busca peça/serviço no catálogo com preço e estoque reais. Chame antes de citar qualquer valor.",
      parameters: {
        type: "object",
        properties: {
          brand: { type: "string", description: "Marca (ex: Samsung)" },
          model: { type: "string", description: "Modelo (ex: Galaxy S23)" },
          part_type: { type: "string", description: "Tipo de peça (ex: tela, vidro, bateria)" },
        },
        required: ["part_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "build_quote",
      description: "Monta o orçamento (peça + mão de obra). Repasse o texto exato ao cliente.",
      parameters: {
        type: "object",
        properties: {
          part_id: { type: "string", description: "ID da peça retornada pelo find_part" },
          service_type: { type: "string", description: "Serviço (ex: Troca de tela)" },
          device_model: { type: "string", description: "Modelo do aparelho" },
        },
        required: ["part_id", "service_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_pre_quote_templates",
      description: "Envia os templates diferenciais da empresa. Chame uma vez, antes do build_quote.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_service_order",
      description: "Cria a OS da manutenção agendada. Chame após confirmar a data; informe part_id para registrar peça e mão de obra.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Título curto (ex: Troca de tela - iPhone 11)" },
          description: { type: "string", description: "Problema relatado" },
          budget_amount: { type: "number", description: "Valor total aprovado" },
          part_id: { type: "string", description: "ID da peça orçada" },
        },
        required: ["subject", "budget_amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_event",
      description: "Agenda no calendário. Só após create_service_order e data E horário confirmados pelo cliente (nunca invente horário).",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Data futura (YYYY-MM-DD)" },
          start_time: { type: "string", description: "Horário dito pelo cliente (HH:MM)" },
          os_id: { type: "string", description: "ID da OS criada" },
        },
        required: ["date", "start_time", "os_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_appointment_status",
      description: "Atualiza o status de um agendamento do cliente: confirmed (confirmou presença), cancelled (cancelou), completed (compareceu/deu tudo certo), no_show (não compareceu).",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", description: "ID do agendamento listado no contexto" },
          status: { type: "string", description: "confirmed | cancelled | completed | no_show" },
        },
        required: ["event_id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_appointment",
      description: "Remarca um agendamento para nova data e horário ditos pelo cliente (nunca invente horário).",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", description: "ID do agendamento listado no contexto" },
          date: { type: "string", description: "Nova data futura (YYYY-MM-DD)" },
          start_time: { type: "string", description: "Novo horário dito pelo cliente (HH:MM)" },
        },
        required: ["event_id", "date", "start_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "handoff_to_human",
      description: "Transfere a conversa para um atendente humano. Use ao finalizar ou quando não puder resolver.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_customer_name",
      description: "Salva o nome que o cliente ACABOU DE DIZER na última mensagem (fala exata, nunca o nome atual do sistema).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome exato dito pelo cliente (ex: Maria)" },
        },
        required: ["name"],
      },
    },
  },
];

function normalizeMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

const POPULAR_BRAND_WORDS = [
  "galaxy", "iphone", "ipad", "samsung", "apple", "xiaomi", "redmi", "note",
  "motorola", "moto", "huawei", "honor", "lg", "asus", "lenovo", "google",
  "pixel", "realme", "oneplus", "pocophone", "poco",
];

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Nome popular -> termo central do modelo: "Galaxy S22" -> "s22", "iPhone 14 Pro Max" -> "14 pro max" */
export function coreModelTerm(model: string): string {
  return stripAccents(model.toLowerCase())
    .split(/\s+/)
    .filter((token) => token.length > 0 && !POPULAR_BRAND_WORDS.includes(token))
    .join(" ")
    .trim();
}

interface SearchTerms {
  brand?: string;
  model?: string;
  part?: string;
}

const PART_COLUMNS = "id, name, price, stock_quantity, part_type, device_brand, device_model";

async function searchProducts(ctx: AgentContext, terms: SearchTerms): Promise<PartRow[]> {
  let query = ctx.supabase
    .from("products")
    .select(PART_COLUMNS)
    .eq("tenant_id", ctx.tenantId)
    .eq("active", true);
  if (terms.brand) query = query.ilike("device_brand", `%${terms.brand}%`);
  if (terms.model) query = query.or(`device_model.ilike.%${terms.model}%,name.ilike.%${terms.model}%`);
  if (terms.part) query = query.or(`part_type.ilike.%${terms.part}%,name.ilike.%${terms.part}%`);
  const { data, error } = await query.limit(5);
  if (error) throw new Error(error.message);
  return (data ?? []) as PartRow[];
}

async function findPart(ctx: AgentContext, args: any): Promise<ToolResult> {
  const part = stripAccents((args.part_type ?? "").toString().toLowerCase());
  const brand = stripAccents((args.brand ?? "").toString().toLowerCase());
  const model = stripAccents((args.model ?? "").toString().toLowerCase());
  const core = coreModelTerm((args.model ?? "").toString());

  const strategies: SearchTerms[] = [
    { brand, model, part },
    { brand, model: core, part },
    { brand, part },
    { model: core, part },
    { part },
  ];

  let rows: PartRow[] = [];
  for (const terms of strategies) {
    if (!terms.brand && !terms.model && !terms.part) continue;
    try {
      rows = await searchProducts(ctx, terms);
    } catch {
      rows = [];
    }
    if (rows.length > 0) break;
  }

  if (rows.length === 0) {
    return {
      ok: true,
      found: false,
      message: "Nenhuma peça encontrada no catálogo. NÃO informe ao cliente que a peça não existe ou está indisponível. Diga com naturalidade: 'Vou te passar para o nosso time técnico e eles vão analisar de perto o caso do seu aparelho.' e chame handoff_to_human em seguida.",
    };
  }

  for (const row of rows) ctx.allowedValues.add(normalizeMoney(Number(row.price)));
  return {
    ok: true,
    found: true,
    parts: rows.map((r: PartRow) => ({
      id: r.id,
      name: r.name,
      price: normalizeMoney(Number(r.price)),
      stock: r.stock_quantity,
      type: r.part_type,
    })),
  };
}

function formatMoney(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function buildQuote(ctx: AgentContext, args: any): Promise<ToolResult> {
  const { data: part, error } = await ctx.supabase
    .from("products")
    .select("id, name, price")
    .eq("id", args.part_id)
    .eq("tenant_id", ctx.tenantId)
    .limit(1)
    .maybeSingle();
  if (error || !part) return { ok: false, error: "Peça não encontrada" };

  const partPrice = normalizeMoney(Number(part.price));
  const labor = ctx.quote.labor_enabled
    ? normalizeMoney(ctx.quote.labor_type === "fixed" ? Number(ctx.quote.labor_value) : partPrice * Number(ctx.quote.labor_value) / 100)
    : 0;
  const total = normalizeMoney(partPrice + labor);

  ctx.allowedValues.add(partPrice);
  ctx.allowedValues.add(labor);
  ctx.allowedValues.add(total);

  const valueText = ctx.quote.labor_enabled && ctx.quote.labor_mode === "separate"
    ? `${formatMoney(partPrice)} da peça + ${formatMoney(labor)} de mão de obra (total ${formatMoney(total)})`
    : formatMoney(total);

  const text = (ctx.quote.quote_template || "Serviço: {servico}\nValor: {valor_total}")
    .replace(/\{cliente\}/g, ctx.contactName)
    .replace(/\{empresa\}/g, ctx.companyName)
    .replace(/\{aparelho\}/g, args.device_model ?? "aparelho")
    .replace(/\{servico\}/g, args.service_type ?? "reparo")
    .replace(/\{peca\}/g, part.name)
    .replace(/\{valor_peca\}/g, formatMoney(partPrice))
    .replace(/\{mao_obra\}/g, formatMoney(labor))
    .replace(/\{valor_total\}/g, valueText)
    .replace(/\{total\}/g, formatMoney(total));

  ctx.canonicalQuote = text;
  return { ok: true, quote_text: text, part_price: partPrice, labor, total };
}

async function createServiceOrder(ctx: AgentContext, args: any): Promise<ToolResult> {
  if (!ctx.agent.auto_os_enabled) return { ok: false, error: "Criação automática de OS desativada pelo administrador." };
  if (!ctx.customer) return { ok: false, error: "Cliente não vinculado à conversa." };

  let partName: string | null = null;
  let partAmount: number | null = null;
  let laborAmount: number | null = null;

  if (args.part_id) {
    const { data: part } = await ctx.supabase
      .from("products")
      .select("id, name, price")
      .eq("id", args.part_id)
      .eq("tenant_id", ctx.tenantId)
      .limit(1)
      .maybeSingle();
    if (part) {
      partName = part.name;
      partAmount = normalizeMoney(Number(part.price));
      laborAmount = ctx.quote.labor_enabled
        ? normalizeMoney(ctx.quote.labor_type === "fixed" ? Number(ctx.quote.labor_value) : partAmount * Number(ctx.quote.labor_value) / 100)
        : 0;
    }
  }

  const { data: order, error } = await ctx.supabase
    .from("service_orders")
    .insert({
      tenant_id: ctx.tenantId,
      customer_id: ctx.customer.id,
      subject: args.subject,
      description: args.description ?? args.subject,
      budget_amount: Number(args.budget_amount) || null,
      part_name: partName,
      part_amount: partAmount,
      labor_amount: laborAmount,
      status: "pending",
      priority: "medium",
      origin: "ai",
    })
    .select("id")
    .single();
  if (error || !order) return { ok: false, error: error?.message ?? "Falha ao criar OS" };

  ctx.openOrders.unshift({
    id: order.id,
    subject: args.subject,
    status: "pending",
    budget_amount: Number(args.budget_amount) || null,
    created_at: new Date().toISOString(),
  });
  return { ok: true, os_id: order.id };
}

function normalizeTime(value: string): string {
  return value.toString().slice(0, 5);
}

function addHour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h * 60 + m + 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

async function scheduleEvent(ctx: AgentContext, args: any): Promise<ToolResult> {
  if (!ctx.agent.auto_schedule_enabled) return { ok: false, error: "Agendamento automático desativado pelo administrador." };
  const date = (args.date ?? "").toString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Data inválida. Use YYYY-MM-DD." };
  if (date < new Date().toISOString().slice(0, 10)) return { ok: false, error: "Data no passado não é permitida." };

  const rawTime = (args.start_time ?? "").toString().trim();
  if (!/^\d{1,2}:\d{2}$/.test(rawTime)) {
    return { ok: false, error: "Horário ausente ou inválido. NÃO invente horário: pergunte ao cliente qual horário ele prefere e aguarde a resposta antes de agendar." };
  }
  const startTime = normalizeTime(rawTime);

  if (!isOpenAt(ctx.businessHours, date, startTime)) {
    const [y, m, d] = date.split("-");
    const brDate = `${d}/${m}/${y}`;
    return {
      ok: false,
      error: `A empresa está FECHADA em ${brDate} às ${startTime} (fora do horário de atendimento). NÃO agende nesse horário. Diga com naturalidade que esse horário não está disponível e proponha o próximo horário válido dentro do expediente: ${nextOpenDayText(ctx.businessHours, ctx.timezone)}. Pergunte ao cliente se prefere essa opção.`,
    };
  }

  const endTime = addHour(startTime);

  const { data: event, error } = await ctx.supabase
    .from("calendar_events")
    .insert({
      tenant_id: ctx.tenantId,
      title: `Manutenção - ${ctx.contactName}`,
      customer: ctx.customer?.name ?? ctx.contactName,
      date,
      start_time: startTime,
      end_time: endTime,
      type: "os",
      os_id: args.os_id ?? null,
      color: "#4f46e5",
      created_by: "ai",
    })
    .select("id")
    .single();
  if (error || !event) return { ok: false, error: error?.message ?? "Falha ao agendar" };

  ctx.appointments.unshift({ id: event.id, title: `Manutenção - ${ctx.contactName}`, date, start_time: startTime, os_id: args.os_id ?? null, status: "scheduled" });
  const [y, m, d] = date.split("-");
  const brDate = `${d}/${m}/${y}`;
  return {
    ok: true,
    event_id: event.id,
    date,
    start_time: startTime,
    os_id: args.os_id ?? null,
    message: `Agendamento criado para ${brDate} às ${startTime}. Confirme verbalmente ao cliente com data e hora exatas (ex: "Agendado para ${brDate} às ${startTime} ✅") e avise que um atendente vai finalizar os detalhes.`,
  };
}

const STATUS_FEEDBACK: Record<string, string> = {
  confirmed: "confirmado ✅",
  cancelled: "cancelado",
  completed: "concluído (cliente compareceu)",
  no_show: "marcado como não compareceu",
};

async function updateAppointmentStatus(ctx: AgentContext, args: any): Promise<ToolResult> {
  const status = String(args?.status ?? "");
  if (!STATUS_FEEDBACK[status]) {
    return { ok: false, error: `Status inválido (${status}). Use: confirmed, cancelled, completed ou no_show.` };
  }
  const { data: ev, error } = await ctx.supabase
    .from("calendar_events")
    .update({ status })
    .eq("id", String(args?.event_id ?? ""))
    .eq("tenant_id", ctx.tenantId)
    .select("id, date, start_time")
    .maybeSingle();
  if (error || !ev) return { ok: false, error: "Agendamento não encontrado." };
  return {
    ok: true,
    status,
    message: `Agendamento de ${ev.date} às ${String(ev.start_time).slice(0, 5)} ${STATUS_FEEDBACK[status]}.`,
  };
}

async function rescheduleAppointment(ctx: AgentContext, args: any): Promise<ToolResult> {
  const date = (args?.date ?? "").toString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Data inválida. Use YYYY-MM-DD." };
  if (date < new Date().toISOString().slice(0, 10)) return { ok: false, error: "Data no passado não é permitida." };

  const rawTime = (args?.start_time ?? "").toString().trim();
  if (!/^\d{1,2}:\d{2}$/.test(rawTime)) {
    return { ok: false, error: "Horário ausente ou inválido. NÃO invente horário: pergunte ao cliente qual horário ele prefere." };
  }
  const startTime = normalizeTime(rawTime);

  if (!isOpenAt(ctx.businessHours, date, startTime)) {
    return {
      ok: false,
      error: `Fora do expediente em ${date} às ${startTime}. Proponha o próximo horário válido: ${nextOpenDayText(ctx.businessHours, ctx.timezone)}.`,
    };
  }

  const endTime = addHour(startTime);
  const { data: ev, error } = await ctx.supabase
    .from("calendar_events")
    .update({ date, start_time: startTime, end_time: endTime, status: "rescheduled", confirmation_asked_at: null })
    .eq("id", String(args?.event_id ?? ""))
    .eq("tenant_id", ctx.tenantId)
    .select("id, title")
    .maybeSingle();
  if (error || !ev) return { ok: false, error: "Agendamento não encontrado." };

  const [y, m, d] = date.split("-");
  const brDate = `${d}/${m}/${y}`;
  return {
    ok: true,
    event_id: ev.id,
    date,
    start_time: startTime,
    message: `Agendamento remarcado para ${brDate} às ${startTime}. Confirme verbalmente ao cliente com data e hora exatas.`,
  };
}
async function sendTemplates(ctx: AgentContext): Promise<ToolResult> {  if (ctx.templates.length === 0) return { ok: true, sent: 0, message: "Nenhum template configurado." };

  const { data: recentOut } = await ctx.supabase
    .from("messages")
    .select("content")
    .eq("conversation_id", ctx.conversation.id)
    .eq("direction", "outbound")
    .order("created_at", { ascending: false })
    .limit(60);
  const alreadySent = new Set((recentOut ?? []).map((row: any) => (row.content ?? "").toString().trim()));

  const { sendText, sendMedia } = await import("./uazapi.ts");
  let sent = 0;
  let skipped = 0;
  for (const tpl of ctx.templates) {
    const content = (tpl.content ?? "").trim();
    if (content && alreadySent.has(content)) {
      skipped++;
      continue;
    }
    try {
      if (tpl.type === "media" && tpl.media_url) {
        await sendMedia(ctx, tpl.media_url, tpl.content);
      } else {
        await sendText(ctx, tpl.content);
      }
      sent++;
    } catch (err) {
      console.warn("[ai-agent] template send failed:", (err as Error).message);
    }
  }
  if (skipped > 0 && sent === 0) {
    return { ok: true, sent, skipped, message: "Templates já haviam sido enviados nesta conversa — reenvio ignorado (regra de etapa única)." };
  }
  return { ok: true, sent, skipped, titles: ctx.templates.map((t) => t.title) };
}

async function updateCustomerName(ctx: AgentContext, args: any): Promise<ToolResult> {
  const raw = args?.name ?? args?.nome ?? args?.customer_name ?? args?.full_name ?? "";
  const name = raw.toString().trim().slice(0, 120);
  if (name.length < 2) return { ok: false, error: `Nome inválido ou muito curto (recebido: ${JSON.stringify(args)}).` };

  if (ctx.customer) {
    const { error } = await ctx.supabase
      .from("customers")
      .update({ name })
      .eq("id", ctx.customer.id)
      .eq("tenant_id", ctx.tenantId);
    if (error) return { ok: false, error: `Falha ao atualizar cliente: ${error.message}` };
  }
  const { error: convError } = await ctx.supabase
    .from("conversations")
    .update({ contact_name: name, customer_name_confirmed: true })
    .eq("id", ctx.conversation.id);
  if (convError) return { ok: false, error: `Falha ao atualizar conversa: ${convError.message}` };

  ctx.customer = ctx.customer ? { ...ctx.customer, name } : null;
  ctx.contactName = name;
  return { ok: true, saved_name: name };
}

export async function executeTool(ctx: AgentContext, name: string, args: any): Promise<ToolResult> {
  ctx.toolsUsed.push(name);
  const result = await executeToolInner(ctx, name, args);
  ctx.toolResults.push({ tool: name, ...result });
  return result;
}

async function executeToolInner(ctx: AgentContext, name: string, args: any): Promise<ToolResult> {
  switch (name) {
    case "find_part":
      return findPart(ctx, args);
    case "build_quote":
      return buildQuote(ctx, args);
    case "send_pre_quote_templates":
      return sendTemplates(ctx);
    case "create_service_order":
      return createServiceOrder(ctx, args);
    case "schedule_event":
      return scheduleEvent(ctx, args);
    case "update_appointment_status":
      return updateAppointmentStatus(ctx, args);
    case "reschedule_appointment":
      return rescheduleAppointment(ctx, args);
    case "update_customer_name":
      return updateCustomerName(ctx, args);
    case "handoff_to_human":
      ctx.handoffRequested = true;
      return { ok: true, message: `Handoff solicitado. Encerre o atendimento com uma mensagem simpática (ex: "${ctx.agent.transfer_message}") e finalize.` };
    default:
      return { ok: false, error: `Tool desconhecida: ${name}` };
  }
}

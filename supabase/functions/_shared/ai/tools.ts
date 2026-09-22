import type { AgentContext, PartRow, ToolResult } from "./types.ts";

export const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "find_part",
      description: "Busca uma peça/serviço no catálogo da empresa (produtos) e retorna preço e estoque reais. Use ANTES de falar qualquer valor.",
      parameters: {
        type: "object",
        properties: {
          brand: { type: "string", description: "Marca do aparelho, ex: Samsung" },
          model: { type: "string", description: "Modelo do aparelho, ex: Galaxy S23" },
          part_type: { type: "string", description: "Tipo de peça/serviço, ex: tela, vidro, bateria, conector de carga" },
        },
        required: ["part_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "build_quote",
      description: "Monta o orçamento final com o preço da peça + mão de obra conforme a configuração da empresa. Retorne o texto exato ao cliente.",
      parameters: {
        type: "object",
        properties: {
          part_id: { type: "string", description: "ID da peça retornada pelo find_part" },
          service_type: { type: "string", description: "Descrição do serviço, ex: Troca de tela" },
          device_model: { type: "string", description: "Modelo do aparelho do cliente" },
        },
        required: ["part_id", "service_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_pre_quote_templates",
      description: "Envia os templates diferenciais da empresa (credibilidade) antes do orçamento. Chame uma vez, antes do build_quote.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_os_status",
      description: "Retorna as ordens de serviço em andamento deste cliente.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_appointments",
      description: "Retorna os agendamentos futuros deste cliente.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_service_order",
      description: "Cria uma ordem de serviço (OS) para a manutenção agendada. Chame após confirmar data com o cliente.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Título curto, ex: Troca de tela - iPhone 11" },
          description: { type: "string", description: "Descrição com o problema relatado" },
          budget_amount: { type: "number", description: "Valor total do orçamento aprovado" },
        },
        required: ["subject", "budget_amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_event",
      description: "Agenda a manutenção no calendário da empresa. Chame depois de create_service_order.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Data no formato YYYY-MM-DD, futura" },
          start_time: { type: "string", description: "Horário no formato HH:MM, padrão 09:00" },
          os_id: { type: "string", description: "ID da OS criada" },
        },
        required: ["date", "os_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "handoff_to_human",
      description: "Transfere a conversa para um atendente humano. Chame ao finalizar o atendimento ou quando não puder resolver.",
      parameters: { type: "object", properties: {} },
    },
  },
];

function normalizeMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

async function findPart(ctx: AgentContext, args: any): Promise<ToolResult> {
  const part = (args.part_type ?? "").toString();
  const brand = (args.brand ?? "").toString();
  const model = (args.model ?? "").toString();
  const supabase = ctx.supabase;

  let query = supabase
    .from("products")
    .select("id, name, price, stock_quantity, part_type, device_brand, device_model")
    .eq("tenant_id", ctx.tenantId)
    .eq("active", true);

  if (brand) query = query.ilike("device_brand", `%${brand}%`);
  if (model) query = query.or(`device_model.ilike.%${model}%,name.ilike.%${model}%`);
  if (part) query = query.or(`part_type.ilike.%${part}%,name.ilike.%${part}%`);

  const { data, error } = await query.limit(5);
  if (error) return { ok: false, error: error.message };

  let rows: PartRow[] = data ?? [];
  if (rows.length === 0) {
    const fb = await supabase
      .from("products")
      .select("id, name, price, stock_quantity, part_type, device_brand, device_model")
      .eq("tenant_id", ctx.tenantId)
      .eq("active", true)
      .ilike("name", `%${part}%${brand}%`)
      .limit(5);
    rows = fb.data ?? [];
  }
  if (rows.length === 0) {
    return { ok: true, found: false, message: "Nenhuma peça encontrada no catálogo. Não informe valores." };
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
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
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

  const { data: order, error } = await ctx.supabase
    .from("service_orders")
    .insert({
      tenant_id: ctx.tenantId,
      customer_id: ctx.customer.id,
      subject: args.subject,
      description: args.description ?? args.subject,
      budget_amount: Number(args.budget_amount) || null,
      status: "pending",
      priority: "medium",
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

async function scheduleEvent(ctx: AgentContext, args: any): Promise<ToolResult> {
  if (!ctx.agent.auto_schedule_enabled) return { ok: false, error: "Agendamento automático desativado pelo administrador." };
  const date = (args.date ?? "").toString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Data inválida. Use YYYY-MM-DD." };
  if (date < new Date().toISOString().slice(0, 10)) return { ok: false, error: "Data no passado não é permitida." };

  const { data: event, error } = await ctx.supabase
    .from("calendar_events")
    .insert({
      tenant_id: ctx.tenantId,
      title: `Manutenção - ${ctx.contactName}`,
      customer: ctx.customer?.name ?? ctx.contactName,
      date,
      start_time: (args.start_time ?? "09:00").toString().slice(0, 5),
      end_time: (args.start_time ?? "10:00").toString().slice(0, 5),
      type: "os",
      os_id: args.os_id ?? null,
      color: "#4f46e5",
    })
    .select("id")
    .single();
  if (error || !event) return { ok: false, error: error?.message ?? "Falha ao agendar" };

  ctx.appointments.push({ id: event.id, title: `Manutenção - ${ctx.contactName}`, date, start_time: (args.start_time ?? "09:00").toString().slice(0, 5), os_id: args.os_id ?? null });
  return { ok: true, event_id: event.id, date };
}

async function sendTemplates(ctx: AgentContext): Promise<ToolResult> {
  if (ctx.templates.length === 0) return { ok: true, sent: 0, message: "Nenhum template configurado." };
  const { sendText, sendMedia } = await import("./uazapi.ts");
  let sent = 0;
  for (const tpl of ctx.templates) {
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
  return { ok: true, sent, titles: ctx.templates.map((t) => t.title) };
}

export async function executeTool(ctx: AgentContext, name: string, args: any): Promise<ToolResult> {
  ctx.toolsUsed.push(name);
  switch (name) {
    case "find_part":
      return findPart(ctx, args);
    case "build_quote":
      return buildQuote(ctx, args);
    case "send_pre_quote_templates":
      return sendTemplates(ctx);
    case "get_os_status":
      return { ok: true, orders: ctx.openOrders };
    case "get_appointments":
      return { ok: true, appointments: ctx.appointments };
    case "create_service_order":
      return createServiceOrder(ctx, args);
    case "schedule_event":
      return scheduleEvent(ctx, args);
    case "handoff_to_human":
      ctx.handoffRequested = true;
      return { ok: true, message: `Handoff solicitado. Encerre o atendimento com uma mensagem simpática (ex: "${ctx.agent.transfer_message}") e finalize.` };
    default:
      return { ok: false, error: `Tool desconhecida: ${name}` };
  }
}

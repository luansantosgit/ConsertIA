import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { quotaExceeded, trackUsage } from "../_shared/ai/settings.ts";

/**
 * Importação inteligente de estoque via IA.
 *
 * Ações:
 * - map:        recebe amostras (primeiras linhas de cada aba da planilha) e
 *               devolve onde está o cabeçalho + mapeamento de colunas + formatos
 * - normalize:  recebe nomes crus de produtos e devolve nome padronizado,
 *               marca e categoria inferidos
 *
 * O parse numérico das milhares de linhas NÃO passa pela IA (custo ~zero):
 * a IA só define o mapa e limpa textos — o JS do front aplica as regras.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Cadeia de modelos baratos para tarefas estruturadas (JSON), do mais barato
// para o mais caro. Se um modelo sair do catálogo ("No endpoints found"),
// cai automaticamente para o próximo — imune a mudanças do OpenRouter.
const IMPORT_MODELS = [
  "meta-llama/llama-3.3-70b-instruct", // ~$0.10/M in · $0.32/M out
  "deepseek/deepseek-v4.1-flash", // ~$0.15/M in · $0.60/M out
  "google/gemini-3.1-flash-lite", // ~$0.25/M in · $1.50/M out (padrao da plataforma)
];
const MODEL_NOT_FOUND_HINTS = [
  "no endpoints found",
  "not a valid model",
  "model_not_found",
  "no allowed providers",
];
const MAX_SHEETS = 15;
const MAX_SAMPLE_ROWS = 10;
const MAX_NAME_BATCH = 60;
const MAX_CELL_CHARS = 40;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SheetInput {
  name: string;
  rows: string[][];
}

interface SheetMapping {
  header_row: number;
  columns: Record<string, number>;
  formats: Record<string, string>;
  confidence: number;
  notes?: string;
}

const MAP_SYSTEM_PROMPT = `Você é um especialista em importação de planilhas de estoque para assistências técnicas de celular.
Recebe as PRIMEIRAS LINHAS CRUS de abas de uma planilha (qualquer formato, qualquer idioma) e deve identificar:

1. "header_row": índice (0-based) da linha que contém os cabeçalhos reais. Planilhas costumam ter título/subtítulo/linhas em branco antes dos cabeçalhos.
2. "columns": mapeie os ÍNDICES das colunas (0-based) para EXATAMENTE estes campos, quando existirem:
   - "name" (nome/descrição do produto — OBRIGATÓRIO identificar)
   - "sku" (código/SKU/ref)
   - "price" (preço de venda)
   - "cost" (preço de custo/compra)
   - "stock_quantity" (quantidade em estoque/qtd/saldo)
   - "min_stock_quantity" (estoque mínimo)
   - "category" (categoria/família/grupo)
   - "location" (localização/prateleira/gaveta)
   - "device_brand" (marca do aparelho compatível)
   - "device_model" (modelo do aparelho compatível)
   NÃO invente colunas. Se um campo não existir, omita-o.
3. "formats": para cada campo numérico, descreva o formato dos valores: "brl_comma" (R$ 1.234,56), "brl_dot" (1,234.56), "plain_comma" (1234,56), "plain" (1234). Para stock_quantity, se houver sufixos como "un", "pc", descreva "plain_with_suffix".
4. "confidence": 0 a 1 da sua certeza geral.
5. "notes": breve observação em português sobre o que não conseguiu mapear.

Responda SEMPRE com JSON válido no formato:
{"sheets":[{"header_row":0,"columns":{"name":2},"formats":{"price":"brl_comma"},"confidence":0.95,"notes":""}]}

Regras: uma aba por entrada, na MESMA ORDEM recebida. Se uma aba não parecer uma tabela de produtos (vazia, texto solto), devolve columns vazio e confidence 0.`;

const NORMALIZE_SYSTEM_PROMPT = `Você padroniza nomes de produtos de assistência técnica de celular (PT-BR).
Para CADA nome cru recebido, devolva:
- "name": nome limpo e padronizado em Title Case bem escrito (corrige abreviações comuns: Iph/Iphone → iPhone, Sam/Samsng → Samsung, Moto → Motorola, Xioami/Xiami → Xiaomi, LG, TelaDisp → Tela Display; expande "carga"→"Conector de Carga", "bateria bts"→"Bateria", "cam tras"→"Câmera Traseira"; separa marca/modelo quando embutidos).
- "brand": marca ONLY se claramente identificável (Apple, Samsung, Motorola, Xiaomi, LG, Asus...). Senão omita.
- "category": categoria ONLY se óbvia (Telas, Baterias, Conectores de Carga, Câmeras, alto-falantes/Campainhas, Películas, Acessórios, Peças em geral). Senão omita.

NUNCA invente preços, quantidades ou especificações. Preserve informação real do nome (cores, tamanhos, "original", "genérica", números do modelo).
Responda SEMPRE com JSON válido:
{"items":[{"i":0,"name":"Tela iPhone 14 Pro","brand":"Apple","category":"Telas"}]}
"i" = índice do item recebido (0-based). Todos os itens recebidos devem aparecer na resposta.`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Extrai JSON de uma resposta que pode vir com fences ```json ou texto ao redor */
function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : content;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Resposta sem JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

function isModelUnavailable(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase();
  return MODEL_NOT_FOUND_HINTS.some((h) => lower.includes(h));
}

/** Tenta a cadeia de modelos; "usedModel" = o que respondeu */
async function callModel(
  apiKey: string,
  systemPrompt: string,
  userContent: string,
  maxTokens: number,
): Promise<{ data: unknown; inputTokens: number; outputTokens: number; usedModel: string }> {
  let lastError = "Nenhum modelo disponível";

  for (const model of IMPORT_MODELS) {
    let resp: Response;
    try {
      resp = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://deeperia.com.br",
          "X-Title": "DeeperIA",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          temperature: 0,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
      });
    } catch (err) {
      lastError = (err as Error).message;
      continue;
    }
    const body = (await resp.json().catch(() => ({}))) as OpenRouterResponse;
    const errorMessage = body.error?.message ?? "";

    if (!resp.ok || errorMessage) {
      lastError = errorMessage || `OpenRouter HTTP ${resp.status}`;
      // Modelo saiu do catálogo / indisponível → tenta o próximo da cadeia
      if (isModelUnavailable(lastError)) continue;
      throw new Error(lastError);
    }

    const content = body.choices?.[0]?.message?.content ?? "";
    if (!content) {
      lastError = "Resposta vazia do modelo";
      continue;
    }
    return {
      data: extractJson(content),
      inputTokens: body.usage?.prompt_tokens ?? 0,
      outputTokens: body.usage?.completion_tokens ?? 0,
      usedModel: model,
    };
  }
  throw new Error(lastError);
}

function truncateCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return s.length > MAX_CELL_CHARS ? `${s.slice(0, MAX_CELL_CHARS)}…` : s;
}

async function loadImportContext(supabase: any, tenantId: string) {
  const [{ data: platform }, { data: entitlement }, { data: tenant }] = await Promise.all([
    supabase.from("platform_ai_config")
      .select("openrouter_token, distribution_mode")
      .limit(1).maybeSingle(),
    supabase.from("tenant_ai_entitlements")
      .select("use_platform_token, token_limit_override")
      .eq("tenant_id", tenantId).limit(1).maybeSingle(),
    supabase.from("tenants").select("plan_id").eq("id", tenantId).limit(1).maybeSingle(),
  ]);

  const apiKey = platform?.openrouter_token ?? null;
  const covered = apiKey &&
    (platform.distribution_mode === "all"
      ? entitlement?.use_platform_token !== false
      : entitlement?.use_platform_token === true);

  let tokenLimit = entitlement?.token_limit_override ?? 0;
  if (!tokenLimit && tenant?.plan_id) {
    const { data: plan } = await supabase.from("plans")
      .select("ai_token_limit").eq("id", tenant.plan_id).limit(1).maybeSingle();
    tokenLimit = plan?.ai_token_limit ?? 0;
  }
  return { apiKey: covered ? apiKey : null, tokenLimit };
}

async function logCall(
  supabase: any,
  tenantId: string,
  inputTokens: number,
  outputTokens: number,
  success: boolean,
  errorMessage: string | null,
  startedAt: number,
  model: string,
) {
  await supabase.from("ai_logs").insert({
    tenant_id: tenantId,
    provider: "openrouter",
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    response_time_ms: Date.now() - startedAt,
    success,
    error_message: errorMessage,
    cost: 0,
  }).then(() => undefined, (e: unknown) => {
    console.warn("[ai-inventory-import] falha ao registrar log:", e);
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Auth: JWT de usuário obrigatório (importação é ação do tenant)
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("users").select("tenant_id").eq("id", userData.user.id).limit(1).maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId) return json({ error: "Usuário sem empresa vinculada" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    const { apiKey, tokenLimit } = await loadImportContext(supabase, tenantId);
    if (!apiKey) {
      return json({ error: "import_ai_unavailable" }, 403);
    }
    if (await quotaExceeded(supabase, tenantId, tokenLimit)) {
      return json({ error: "quota_exceeded" }, 429);
    }

    let inputTokens = 0;
    let outputTokens = 0;

    try {
      if (action === "map") {
        const sheets: SheetInput[] = Array.isArray(body?.sheets) ? body.sheets : [];
        if (sheets.length === 0 || sheets.length > MAX_SHEETS) {
          return json({ error: `Envie entre 1 e ${MAX_SHEETS} abas` }, 400);
        }
        const payload = sheets.map((s) => ({
          name: String(s.name ?? "aba").slice(0, 30),
          rows: (s.rows ?? []).slice(0, MAX_SAMPLE_ROWS).map((r) =>
            (Array.isArray(r) ? r : []).slice(0, 25).map(truncateCell)
          ),
        }));
        const result = await callModel(
          apiKey,
          MAP_SYSTEM_PROMPT,
          `Abas da planilha (JSON):\n${JSON.stringify({ sheets: payload })}`,
          3000,
        );
        inputTokens += result.inputTokens;
        outputTokens += result.outputTokens;

        const parsed = result.data as { sheets?: SheetMapping[] };
        const mappings = Array.isArray(parsed?.sheets) ? parsed.sheets : [];
        await trackUsage(supabase, tenantId, inputTokens, outputTokens, 0);
        await logCall(supabase, tenantId, inputTokens, outputTokens, true, null, startedAt, result.usedModel);
        return json({ ok: true, model: result.usedModel, sheets: mappings });
      }

      if (action === "normalize") {
        const items: unknown[] = Array.isArray(body?.items) ? body.items : [];
        if (items.length === 0 || items.length > MAX_NAME_BATCH) {
          return json({ error: `Envie entre 1 e ${MAX_NAME_BATCH} nomes por lote` }, 400);
        }
        const names = items.map((n) => String(n ?? "").slice(0, 120));
        const result = await callModel(
          apiKey,
          NORMALIZE_SYSTEM_PROMPT,
          `Nomes crus (JSON):\n${JSON.stringify({ items: names })}`,
          4000,
        );
        inputTokens += result.inputTokens;
        outputTokens += result.outputTokens;

        const parsed = result.data as {
          items?: Array<{ i?: number; name?: string; brand?: string; category?: string }>;
        };
        const clean = Array.isArray(parsed?.items) ? parsed.items : [];
        await trackUsage(supabase, tenantId, inputTokens, outputTokens, 0);
        await logCall(supabase, tenantId, inputTokens, outputTokens, true, null, startedAt, result.usedModel);
        return json({ ok: true, model: result.usedModel, items: clean });
      }

      return json({ error: "action inválida (use map ou normalize)" }, 400);
    } catch (err) {
      await trackUsage(supabase, tenantId, inputTokens, outputTokens, 0);
      await logCall(supabase, tenantId, inputTokens, outputTokens, false, (err as Error).message, startedAt, IMPORT_MODELS[0]);
      return json({ error: (err as Error).message }, 502);
    }
  } catch (err) {
    console.error("[ai-inventory-import] erro:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

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
  "deepseek/deepseek-v4.1-flash", // ~$0.15/M in · $0.60/M out — rápido
  "google/gemini-3.1-flash-lite", // ~$0.25/M in · $1.50/M out — padrão da plataforma
  "meta-llama/llama-3.3-70b-instruct", // ~$0.10/M in · $0.32/M out — mais lento
];
const MODEL_NOT_FOUND_HINTS = [
  "no endpoints found",
  "not a valid model",
  "model_not_found",
  "no allowed providers",
];
const MAX_SHEETS = 15;
const MAX_SAMPLE_ROWS = 10;
const MAX_NAME_BATCH = 100;
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
   - "name" (nome/descrição/produto/serviço — OBRIGATÓRIO identificar)
   - "sku" (código/SKU/ref/referência/cód)
   - "price" (preço de venda/preço/valor/venda)
   - "cost" (custo/compra/fornecedor/lucro base)
   - "stock_quantity" (estoque/qtd/quantidade/saldo/atual)
   - "min_stock_quantity" (mínimo/estoque mínimo/min)
   - "category" (categoria/família/grupo/tipo de produto)
   - "location" (localização/prateleira/gaveta/local/posição)
   - "device_brand" (marca do aparelho compatível: Apple/Samsung/Motorola...)
   - "device_model" (modelo do aparelho compatível: iPhone 14, Galaxy S23...)
   - "part_type" (qualidade/tipo de peça: original, premium, compatível, genérica, lacradora, incell, refurb...)
   IMPORTANTE: capture TODA coluna que contenha informação real de um destes campos — mesmo com cabeçalho incomum ou grafia errada. Só omita quando a coluna NÃO existir de fato.
3. "formats": para cada campo numérico mapeado, descreva o formato: "brl_comma" (R$ 1.234,56), "brl_dot" (1,234.56), "plain_comma" (1234,56), "plain" (1234). Para stock_quantity com sufixos ("10 un"), use "plain_with_suffix".
4. "confidence": 0 a 1 da sua certeza geral.
5. "notes": breve observação em português sobre o que não conseguiu mapear.

Responda SEMPRE com JSON válido no formato:
{"sheets":[{"header_row":0,"columns":{"name":2,"part_type":7},"formats":{"price":"brl_comma"},"confidence":0.95,"notes":""}]}

Regras: uma aba por entrada, na MESMA ORDEM recebida. Se uma aba não parecer uma tabela de produtos (vazia, texto solto), devolve columns vazio e confidence 0.`;

const VALID_BRANDS = [
  "Apple", "Samsung", "Motorola", "Xiaomi", "Asus", "LG", "ZTE", "Huawei",
  "Honor", "Realme", "Nokia", "Sony", "Multilaser", "Positivo",
];

const NORMALIZE_BASE_PROMPT = `Você padroniza nomes de produtos de assistência técnica de celular (PT-BR).
Para CADA nome cru recebido, devolva SEMPRE um item na resposta (nunca pule):
- "name": nome limpo e padronizado em Title Case bem escrito. Corrija abreviações: Iph/Iphone/Iphon → iPhone; Sam/Samsng → Samsung; Moto → Motorola; Xioami/Xiami → Xiaomi. NÚMEROS SOLTOS após contexto iPhone significam o modelo: "11 Pro Max" → iPhone 11 Pro Max; "14" → iPhone 14; "S23" → Galaxy S23. "carga"→"Conector de Carga"; "cam tras"→"Câmera Traseira"; "bateria bts"→"Bateria". Preserve cores, tamanhos e números de modelo.
- "brand": marca do APARELHO COMPATÍVEL — OBRIGATORIAMENTE uma destas: ${VALID_BRANDS.join(", ")}. "iPhone"/"Iph" indicam Apple (NUNCA devolva "IPHONE"/"Iphone" como marca). Se não der para identificar, omita.
- "model": modelo do aparelho quando identificável ("iPhone 11", "iPhone 14 Pro Max", "Galaxy S23", "Redmi Note 12"). Se não houver, omita.
- "MÚLTIPLOS MODELOS NA MESMA LINHA": quando o nome lista VÁRIOS aparelhos/modelos (separados por '/', '+', vírgula ou ' e ', e às vezes só por espaços quando óbvio), devolva UM ITEM PARA CADA MODELO — todos com o MESMO "i" do item recebido. Ex.: "NOTE 10 4G/ NOTE 10S / POCO M5S" (i=5) → três itens: {"i":5,"name":"...Redmi Note 10 4G...","brand":"Xiaomi","model":"Redmi Note 10 4G"}, {"i":5,"name":"...Redmi Note 10S...","brand":"Xiaomi","model":"Redmi Note 10S"}, {"i":5,"name":"...POCO M5s...","brand":"Xiaomi","model":"POCO M5s"}. "MI NOTE" = Xiaomi Redmi Note. Cada variante mantém a característica comum (ex.: CURVADA ORI → part_type "original" em todas).
- "part_type": qualidade/tipo de peça em minúsculas canônico: "ORI"/"ORIGINAL" → "original"; "GEN"/"GENÉRICA"/"COPY"/"CÓPIA" → "compatível"; "PREMIUM" → "premium"; "INC"/"INCELL" → "incell"; "REBUILD"/"REFURB"/"LACRADORA" → "recondicionada". Se não houver, omita.
- "category": categoria ONLY se óbvia (Telas, Baterias, Conectores de Carga, Câmeras, alto-falantes/Campainhas, Películas, Acessórios, Peças em geral). Senão omita.
- "unclear": array com pedaços/tokens do nome que você NÃO conseguiu interpretar com segurança — siglas de qualidade/fabricante de peça que não são padrão de mercado (ex.: "JK", "OCA", "SOFT", "HARD", "AM"), códigos desconhecidos, modelos que não reconhece. NÃO chute o significado: devolva em "unclear" para a empresa esclarecer (mantenha o termo no "name"). Se entendeu tudo, devolva [].
- "confidence": 0 a 1 da sua certeza sobre a interpretação do item.

NUNCA invente preços, quantidades ou especificações. Mas SEMPRE devolva o item com o nome limpo, mesmo que só brand/model/part_type não sejam identificáveis (aí apenas os omita).
Responda SEMPRE com JSON válido:
{"items":[{"i":0,"name":"Tela iPhone 11","brand":"Apple","model":"iPhone 11","part_type":"original","category":"Telas","unclear":[],"confidence":0.95}]}
"i" = índice do item recebido (0-based). A resposta deve ter EXATAMENTE o mesmo número de itens recebidos.`;

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
    let data: unknown;
    try {
      data = extractJson(content);
    } catch {
      // JSON cortado (limite de tokens) ou malformado: tenta o próximo
      // modelo da cadeia — cada um tem limite/velocidade diferentes
      lastError = "Resposta com JSON truncado ou inválido";
      continue;
    }
    return {
      data,
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

      // normalize e clarify compartilham o mesmo pipeline: clarify inclui a
      // resposta da empresa sobre um termo e a salva no glossário do tenant
      if (action === "normalize" || action === "clarify") {
        const items: unknown[] = Array.isArray(body?.items) ? body.items : [];
        if (items.length === 0 || items.length > MAX_NAME_BATCH) {
          return json({ error: `Envie entre 1 e ${MAX_NAME_BATCH} nomes por lote` }, 400);
        }
        const names = items.map((n) => String(n ?? "").slice(0, 120));

        // Glossário do tenant: respostas anteriores da empresa
        const { data: glossaryRows } = await supabase
          .from("ai_import_glossary")
          .select("term, meaning")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(50);

        const clarification = action === "clarify"
          ? { term: String(body?.term ?? "").slice(0, 60), meaning: String(body?.meaning ?? "").slice(0, 300) }
          : null;

        let systemPrompt = NORMALIZE_BASE_PROMPT;
        const glossaryText = (glossaryRows ?? [])
          .map((g: { term: string; meaning: string }) => `'${g.term}' = ${g.meaning}`)
          .join("; ");
        if (glossaryText) {
          systemPrompt += `\n\nGlossário desta empresa (contexto já esclarecido por eles — use e NÃO pergunte de novo):\n${glossaryText}`;
        }
        if (clarification?.term && clarification.meaning) {
          systemPrompt += `\n\nA empresa acabou de esclarecer: '${clarification.term}' significa: ${clarification.meaning}. Aplique esta interpretação aos nomes abaixo.`;
        }

        const result = await callModel(
          apiKey,
          systemPrompt,
          `Nomes crus (JSON):\n${JSON.stringify({ items: names })}`,
          8000,
        );
        inputTokens += result.inputTokens;
        outputTokens += result.outputTokens;

        // Resposta útil da empresa vira glossário: próxima importação já sabe
        if (clarification?.term && clarification.meaning) {
          await supabase
            .from("ai_import_glossary")
            .upsert(
              { tenant_id: tenantId, term: clarification.term, meaning: clarification.meaning },
              { onConflict: "tenant_id,term" },
            )
            .then(() => undefined, (e: unknown) => {
              console.warn("[ai-inventory-import] falha ao salvar glossário:", e);
            });
        }

        const parsed = result.data as {
          items?: Array<{ i?: number; name?: string; brand?: string; model?: string; part_type?: string; category?: string; unclear?: string[]; confidence?: number }>;
        };
        const clean = Array.isArray(parsed?.items) ? parsed.items : [];
        await trackUsage(supabase, tenantId, inputTokens, outputTokens, 0);
        await logCall(supabase, tenantId, inputTokens, outputTokens, true, null, startedAt, result.usedModel);
        return json({ ok: true, model: result.usedModel, items: clean });
      }

      return json({ error: "action inválida (use map, normalize ou clarify)" }, 400);
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

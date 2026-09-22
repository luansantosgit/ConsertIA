# Plano — Agente de IA Especialista em Assistência Técnica

> **Status (22/09/2026): IMPLEMENTADO — Fases 0 a 6 concluídas** (PRs #6, #8, #10 / Issues #5, #7, #9).
> Pendências externas: (1) cadastrar token OpenRouter no Superadmin > Provedor de IA; (2) ativar toggle "IA" na conexão WhatsApp; (3) integração de cobrança Asaas para recompra de cota (futura).

## Goal
Transformar a IA (hoje 100% mockada) em um motor real via **OpenRouter multimodal** (texto, áudio, imagem, vídeo, documentos), **recurso distinto e agnóstico de canal**, consumido por conexões WhatsApp que optarem por ela, com roteiro especialista: saudação → triagem → diagnóstico (tela/vidro) → template diferencial → orçamento (peça do catálogo + mão de obra) → agendamento + OS → transferência com consciência de contexto.

## Princípios de Arquitetura
1. **IA = recurso do tenant, sem amarras com canal.** Configurações vivem em tabelas próprias (`ai_*`), não em `connections`.
2. **Canal apenas consume a IA:** cada `connection` terá toggle `ai_enabled`. Webhook resolve a conexão; se o canal não ativou a IA, o pipeline nunca dispara.
3. **Preço nunca é inventado (blindagem em 2 camadas):** (1) prompt determina que valores só vêm da tool `find_part`; (2) validador determinístico de saída intercepta valores monetários (regex R$/números) e compara com os retornos reais das tools — valor fora da lista → mensagem bloqueada e regenerada antes do envio. O cálculo do orçamento (peça + mão de obra) é feito **em código, não no LLM**.
4. **Toda decisão logada** em `ai_logs` (tools, tokens, tempo, erros).
5. OpenRouter com API key do tenant, protegida por RLS (nunca no bundle — só em edge function / service role).
6. **Token central vs próprio:** o Superadmin cadastra o token OpenRouter da plataforma e define o modo de uso (`todas` as empresas, com limite de consumo por plano, ou `selecionadas`); empresas sem entitlement usam token próprio no painel delas. Cota estourada → IA pausa com aviso (hook preparado para compra de créditos via API do Asaas no futuro).

## Decisão de Arquitetura — Subagentes (economia × assertividade)

**Cenário escolhido: 1 agente orquestrador + guardrails determinísticos em código + revisor barato só em mensagens críticas.**

| Abordagem | Assertividade | Economia | Latência | Veredito |
|---|---|---|---|---|
| Multi-agente (orquestrador + subagentes por tarefa em cascata) | +5~10% | ✗ custo 3-5x (cada sub-agente carrega contexto completo) | ✗ cliente espera múltiplos round-trips no WhatsApp | **Descartada no caminho crítico** |
| 1 orquestrador + tools (function calling) | Alta (dados vêm do banco, não da "memória" do LLM) | ✓ 1 chamada por resposta | Baixa | **Adotada** |
| Revisor LLM (modelo cheap/flash) validando cada mensagem | Alta | ✗ dobra custo/tokens em TODA msg | +1-2s | **Só em mensagens críticas: orçamento e confirmação de agendamento** |

Regras:
- Orçamento e agendamento: orquestrador → **revisor cheap 1-shot** (valida valores contra tools e dados do cliente) → validador determinístico em código → envio. Assertividade máxima onde o erro custa caro.
- Saudação/chitchat/status: orquestrador direto + validador em código (custo mínimo).
- Subagentes **assíncronos, fora do caminho crítico** (onde brilham sem custo de latência): (a) sumarização da conversa no handoff para o atendente; (b) auditoria noturna de conversas atendidas pela IA para melhoria contínua do roteiro.

## Fases e Tarefas

### Fase 0 — Fundação (schema + correções de divergência)
- [ ] Migration alinhando `ai_configs` e `ai_logs` (schema SQL diverge do tipo TS hoje)
- [ ] Migration `ai_agent_settings` (1/tenant): nome do agente, saudação ativa, simulação de digitação, modelo OpenRouter, comportamento pós-transferência (`continue` | `pause`), mensagem de transferência, ativo
- [ ] Migration `ai_quote_settings` (1/tenant): mão de obra (ativa, modo `separado` | `incluso`, tipo fixo/%, valor), template de orçamento com variáveis (`{peca}`, `{valor}`, `{mao_obra}`, `{total}`, `{empresa}`)
- [ ] Migration `ai_pre_quote_templates`: título, tipo `text` | `media`, texto/legenda, media_url, ativo, ordem
- [ ] Migration `ai_diagnosis_settings` (1/tenant): `screen_only` | `screen_and_glass` + `glass_rules` (condições que qualificam orçamento de vidro)
- [ ] Migration `ai_device_coverage`: device_type (smartphone/tablet/notebook/…), brands jsonb, `other_transfer` (fora da lista → transfere imediatamente)
- [ ] Migration conversas/mensagens/canal/produtos: `conversations.ai_state` (`attending` | `handed_off` | `paused`), `messages.sender_type` (`customer` | `ai` | `attendant`), `connections.ai_enabled` (default false), `products.part_type` + `device_brand` + `device_model` (matching confiável de peça)
- [ ] Migration provider/cotas: `platform_ai_config` (token OpenRouter central, modo `all` | `selected`), `tenant_ai_entitlements` (tenant_id, usa_token_da_plataforma bool, override de limite), `plans.ai_token_limit`, `ai_token_usage` (tenant_id, período, tokens_in/out, custo, acumulado mensal) — índice único (tenant_id, período)
- [ ] Remover tipos duplicados `Conversation`/`Message` em `src/types/index.ts`
- **Verify:** `supabase db push --linked` + script de consulta validando colunas novas

### Fase 1 — Motor de IA (edge function `ai-agent`, desacoplada de canal)
- [ ] Criar `supabase/functions/ai-agent/`: recebe `{conversation_id, message_id}`; carrega settings do tenant, contexto (últimas N mensagens, OS aberta, agendamentos, cliente, cobertura de aparelhos); chamada OpenRouter multimodal (imagem → vision; áudio/vídeo → modelo com entrada multimodal; documento → extração de texto)
- [ ] Function calling com tools: `find_part(brand, model, part_type)`, `get_os_status()`, `get_appointments()`, `create_service_order()`, `schedule_event(date)`, `handoff_to_human()`, `get_device_coverage()`
- [ ] System prompt builder — roteiro especialista:
  - **Saudação calorosa SEMPRE**: período do dia + **nome do agente** (`ai_agent_settings.agent_name`) + "assistente de suporte da {{empresa}}" (nome de `tenant_settings`) — ex.: "Bom dia! Eu sou a Ana, assistente de suporte da TechFix..."; se a 1ª mensagem já traz o problema, recepciona elegantemente e **já continua a conversa ciente do problema** (nunca pula a recepção); se genérica → se coloca à disposição
  - Triagem: aparelho/marca/modelo/problema → valida contra `ai_device_coverage` (fora da lista → mensagem de especialista + `handoff`)
  - Problema de tela: decide **tela vs vidro** conforme `ai_diagnosis_settings.glass_rules`
  - Envia template diferencial (`ai_pre_quote_templates`) antes do orçamento
  - Orçamento: `find_part` → peça + mão de obra conforme modo (`separado` cita a parte; `incluso` soma sem citar)
  - Pergunta a data da manutenção → confirma → cria evento no calendário + OS (`status: pending`)
  - Anuncia transferência → `handoff_to_human()` → `ai_state = handed_off`
- [ ] Digitação simulada + **mensagens humanizadas**: o prompt instrui o LLM a dividir a resposta em blocos curtos (delimitador `---`), como um humano faria; a edge envia sequencialmente: `POST /message/presence` `composing` (uazapi-openapi-spec.yaml:5202) → delay proporcional ao tamanho de cada parte → `/send/text` ou `/send/media`, parte a parte
- [ ] Guardrails: validador determinístico de preço em código (valores R$ fora das tools → bloqueia e regenera); revisor cheap 1-shot apenas para orçamento/agendamento; confirmar data antes de agendar; erro de LLM → retry → fallback mensagem + handoff
- [ ] Resolução de token/cota: resolve entitlement do tenant (token da plataforma × token próprio), consulta consumo do mês (`ai_token_usage`), cota estourada → pausa IA com aviso (preparado para top-up via Asaas futuro)
- [ ] Log completo por decisão em `ai_logs` (provider, modelo, tokens, tools usadas, decisões, erros)
- **Verify:** `supabase functions deploy ai-agent` + script simulando conversa real

### Fase 2 — Webhook + disparo por canal
- [ ] `uazapi-webhook`: após persistir inbound, carrega a `connection`; se `ai_enabled && ai_state` permitir → invoca `ai-agent` sem bloquear o webhook
- [ ] Pós-transferência (`ai_agent_settings`): `continue` = IA segue respondendo ciente da OS/agendamento; `pause` = silencia (padrão: `continue`)
- [ ] Atendente abre a conversa e começa a digitar → front emite claim → IA envia "Um instante, nossos atendentes vão te chamar" e `ai_state = paused` até a conversa encerrar; se cliente voltar com OS em andamento, IA retoma ciente do contexto
- [ ] Redeploy: `supabase functions deploy uazapi-webhook --no-verify-jwt`
- **Verify:** teste ponta a ponta: canal com IA atende; canal sem IA não responde nunca

### Fase 3 — Menus "Agente de IA" (front)
- [ ] **Remover** "Configurar com IA" (mock) e "Respostas" (superseded). Nav final: Personalidade, Comportamento, Templates Diferenciais, Orçamentos, Diagnósticos, Integrações, Histórico
- [ ] Templates Diferenciais: CRUD (texto, mídia + legenda), ordenação, ativo — com `ConfirmModal`, `EmptyState`, Skeletons
- [ ] Orçamentos: template de orçamento + config de mão de obra (separado/incluso, fixo/%)
- [ ] Diagnósticos: `screen_only` vs `screen_and_glass` + regras de vidro
- [ ] Comportamento: toggles **persistidos** (auto OS, auto agendamento, simulação de digitação, pós-transferência)
- [ ] Integrações: campo de token OpenRouter próprio (exibido **somente** se a empresa não tem entitlement ao token da plataforma) + seleção de modelo + barra de consumo/cota do mês (tokens usados × limite)
- **Verify:** `npx tsc --noEmit` + persistência real de cada seção no banco

### Fase 4 — Settings, canal e Superadmin (provider de IA)
- [ ] Nova seção em Configurações: tipos de aparelho (smartphone/tablet/…) + marcas por tipo + "outros → transferir para atendente"
- [ ] Em Conexões WhatsApp: toggle por canal "Agente de IA atende neste canal" (`connections.ai_enabled`)
- [ ] Superadmin: nova página "Provedor de IA" — cadastrar token OpenRouter da plataforma, modo de uso (todas as empresas com limite do plano × somente selecionadas), marcar/desmarcar empresas, dashboard de consumo por empresa (tokens/custo/mês) e status da cota
- [ ] Enforce de cota na edge `ai-agent`: sem cota/token → IA pausa com aviso; estrutura pronta para top-up via Asaas (integração futura)
- **Verify:** toggles e entitlements persistidos; consumo agregando corretamente por empresa

### Fase 5 — Chat UI (indicadores de IA)
- [ ] `ConversationCard`: ícone roxo de IA quando `ai_state = attending`; troca ícone/cor ao transferir para atendente
- [ ] Clique do atendente no ícone da IA durante atendimento: `ConfirmModal` → dispara mensagem da IA + handoff
- [ ] `MessageBubble`: badge real de IA via `sender_type = 'ai'` (remover código morto `from='bot'`)
- **Verify:** ambos os estados visuais no chat real

### Fase 6 — Qualidade "quase infalível"
- [ ] Testes unitários: prompt builder, cálculo de orçamento (peça + mão de obra), matching de peça (marca/modelo/part_type)
- [ ] E2E: saudação, problema direto na 1ª msg, orçamento tela, orçamento vidro, agendamento + OS, transferência, retomada ciente da OS
- [ ] Métricas no Histórico: taxa de handoff, erros, tempo de resposta, custo
- [ ] Resiliência: circuit breaker (OpenRouter fora → handoff imediato + aviso), retry, timeout por mensagem
- **Verify:** `npm run build` + E2E verde

## Done When
- [ ] "Bom dia" → saudação com período + empresa; problema na 1ª msg → **sauda calorosamente e já segue ciente do problema** (recepção nunca é pulada)
- [ ] Nenhum valor monetário é enviado sem origem na tool `find_part` (validador bloqueia preço inventado)
- [ ] Orçamento usa preço real da peça do catálogo + mão de obra conforme config (separada ou embutida)
- [ ] Data confirmada → evento no calendário + OS criada → conversa transferida → IA responde ciente da OS em msgs futuras
- [ ] Canal com `ai_enabled=false` → IA jamais responde; com `true` → atende
- [ ] Superadmin: token central distribuído por modo (todas/selecionadas) com cota por plano; empresa sem entitlement usa token próprio; cota estourada → IA pausa com aviso (hook Asaas preparado)
- [ ] Digitação "composing" visível no WhatsApp antes de cada resposta, com mensagens divididas em partes estratégicas (nunca um bloco único)
- [ ] Ícone de IA no card do chat muda ao transferir; clique do atendente dispara a mensagem de handoff
- [ ] `npx tsc --noEmit` limpo; funções deployadas com as flags corretas

## Notas (regras do AGENTS.md)
- Cada fase = 1 GitHub Issue + feature branch + PR ("Closes #N")
- Deploy: `ai-agent` e `uazapi-webhook` (este com `--no-verify-jwt`)
- Máx. 200 linhas por arquivo: `useAttendance.ts` (~1180 linhas) e `SettingsPage.tsx` (812 linhas) devem ser refatorados quando tocados

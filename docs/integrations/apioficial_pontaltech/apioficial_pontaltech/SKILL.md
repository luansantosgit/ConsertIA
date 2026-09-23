---
name: apioficial_pontaltech
description: >
  Integração COMPLETA com a API WhatsApp Business via BSP Pontaltech (proxy oficial da Meta).
  Use esta skill SEMPRE que o agente precisar de qualquer coisa relacionada a:
  WhatsApp API Pontaltech, integrar WhatsApp no projeto, configurar campos de integração
  WhatsApp no super admin, construir dashboard de consumo/pricing analytics WhatsApp,
  autenticar na API Pontaltech (Bearer Token), enviar mensagens WhatsApp (template, texto,
  mídia, interativas, listas), criar/editar/deletar templates de mensagem, fazer upload de
  mídias para WhatsApp, registrar/gerenciar webhooks/callbacks WhatsApp, fazer Embedded
  Signup de conta WABA, gerenciar números de telefone comerciais WhatsApp, consultar custos
  e volumes de mensagens, erros da WhatsApp API, rate limiting, boas práticas WhatsApp.
  Também use quando o usuário mencionar WABA, Phone Number ID, wamid, NewPointer,
  whatsapp-auth.pontaltech.com.br, pricing analytics ou callbacks de WhatsApp.
---

# API Oficial WhatsApp — Pontaltech BSP

## Arquitetura

```
Seu Sistema → API Pontaltech → Meta WhatsApp Cloud API
```

A Pontaltech atua como proxy BSP. Os webhooks da Meta são repassados **sem modificação**.

### URLs Base por Serviço

| Serviço | URL Base |
|---------|----------|
| Autenticação + Mensagens + Templates + Webhooks + Números | `https://whatsapp-auth.pontaltech.com.br` |
| Upload de Mídias | `https://whatsapp-media-api.pontaltech.com.br` |
| Pricing Analytics | `https://pontaltech-whatsapp-analytics.pontaltech.com.br` |

---

## 1. Campos de Integração no Super Admin

Seguir o padrão das demais integrações da plataforma. Campos obrigatórios:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `username` | texto | Username do NewPointer (fornecido pela Pontaltech) |
| `password` | senha (mascarado) | Password do NewPointer (fornecido pela Pontaltech) |
| `waba_id` | texto | ID da WhatsApp Business Account — obtido no Embedded Signup |
| `phone_number_id` | texto | ID do número de telefone remetente — obtido no Embedded Signup |
| `webhook_url` | texto | URL do webhook da plataforma para receber eventos |

**Token de acesso:** é gerado dinamicamente via API com TTL de 1 hora. Nunca persistir em banco de dados. Renovar em cache com TTL de 55 minutos ou ao receber HTTP 401.

---

## 2. Autenticação — Bearer Token

**OBRIGATÓRIO para todos os endpoints.** Header: `Authorization: Bearer <token>`

```http
POST https://whatsapp-auth.pontaltech.com.br/authenticate
Content-Type: application/json

{
  "username": "seu_usuario",
  "password": "sua_senha"
}
```

**Resposta de sucesso:**
```json
{ "token": "eyJraWQiOiJW...", "expiresIn": 3600 }
```

**Estratégia de renovação:**
- Cache em memória com TTL de 55 min
- Renovar automaticamente ao receber HTTP 401
- Para validar token: `GET https://whatsapp-auth.pontaltech.com.br/authenticate/validate?wabaId={wabaId}`

---

## 3. Embedded Signup — Onboarding do Cliente

Processo único para criar/vincular a WABA do cliente à Pontaltech. Após concluído, o cliente recebe WABA ID e Phone Number ID na tela automaticamente. Templates passam por aprovação; WABA não precisa de aprovação separada.

### Obter URL do Embedded Signup

```http
GET https://whatsapp-auth.pontaltech.com.br/embedded_signup
Authorization: Bearer {token}
Content-Type: application/json
```

**Tipo 1 — Link de Business Account (sem solução parceiro):**
```json
{
  "account_name": "WABA Marketing",
  "easy_mode": false
}
```
Resposta: `{ "url": "https://whatsapp-embedded-signup.pontaltech.com.br/?reference=...", "type": "business_account_invite", "expires_in": "24h" }`

**Tipo 2 — Link de Parceiro/Revendedor (com solution_id):**
```json
{
  "solution_id": "111222333444888xD",
  "solution_name": "Whatsapp Connection",
  "account_name": "Minha Empresa WhatsApp",
  "easy_mode": true
}
```
Resposta: `{ "url": "https://whatsapp-embedded-signup.pontaltech.com.br/easy/?reference=...", "type": "partner_invite", "expires_in": "24h" }`

**Campos do body:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `solution_id` | string | Não (mas obrigatório para parceiros) | ID da solução WhatsApp — se presente, gera Link de Parceiro |
| `solution_name` | string | Não | Nome da solução (usado com solution_id) |
| `account_name` | string | Não | Nome da conta para identificação |
| `easy_mode` | boolean | Não (default: false) | `true` → adiciona `/easy/` na URL. Usar quando cliente ainda não tem número no Facebook Business Manager |

> ⚠️ Parceiros/revendedores DEVEM sempre gerar links com `solution_id`. Links sem solução vinculada não são permitidos para parceiros.

---

## 4. Envio de Mensagens

```
POST https://whatsapp-auth.pontaltech.com.br/v22.0/{phone_number_id}/messages
Authorization: Bearer {token}
Content-Type: application/json
```

**Resposta de sucesso (todos os tipos):**
```json
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "5511999999999", "wa_id": "5511999999999" }],
  "messages": [{ "id": "wamid.HBgL..." }]
}
```
O `wamid` é o ID da mensagem — guardar para rastrear via callbacks.

### 4.1 Template (obrigatório fora da janela de 24h ou para contato proativo)
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "nome_do_template",
    "language": { "code": "pt_BR" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "valor_variavel_1" }
        ]
      }
    ]
  }
}
```

### 4.2 Texto Livre (apenas dentro da janela de 24h — usuário respondeu recentemente)
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999999999",
  "type": "text",
  "text": { "preview_url": false, "body": "Texto da mensagem" }
}
```

### 4.3 Resposta Contextual (reply com contexto)
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999999999",
  "context": { "message_id": "<WAMID_ANTERIOR>" },
  "type": "text",
  "text": { "preview_url": false, "body": "Resposta aqui" }
}
```

> Para tipos avançados (mídia, interativos, listas, botões, OTP), ver `references/mensagens-avancadas.md`

---

## 5. Gerenciamento de Templates

### 5.1 Listar Templates
```http
GET https://whatsapp-auth.pontaltech.com.br/v22.0/{waba_id}/message_templates
GET https://whatsapp-auth.pontaltech.com.br/v22.0/{waba_id}/message_templates?name={nome}
GET https://whatsapp-auth.pontaltech.com.br/v22.0/{template_id}
```

### 5.2 Criar Template
```http
POST https://whatsapp-auth.pontaltech.com.br/v22.0/{waba_id}/message_templates
Authorization: Bearer {token}
Content-Type: application/json
```
```json
{
  "name": "nome_template",
  "language": "pt_BR",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Cabeçalho aqui"
    },
    {
      "type": "BODY",
      "text": "Olá {{1}}, seu pedido {{2}} foi confirmado.",
      "example": { "body_text": [["João", "12345"]] }
    },
    {
      "type": "FOOTER",
      "text": "Rodapé opcional"
    }
  ]
}
```

**Categorias:** `MARKETING` | `UTILITY` | `AUTHENTICATION`

**Status após criação:** `PENDING` → aguardar aprovação antes de usar.

**Tempos de aprovação (estimativa):**
- AUTHENTICATION: algumas horas
- UTILITY: 1-2 dias úteis
- MARKETING: 2-5 dias úteis

**Status possíveis:** `PENDING` | `APPROVED` | `REJECTED` | `DISABLED`

### 5.3 Editar Template
```http
POST https://whatsapp-auth.pontaltech.com.br/v22.0/{waba_id}/message_templates
```
Enviar mesmo payload de criação com o nome do template existente.

### 5.4 Deletar Template
```http
DELETE https://whatsapp-auth.pontaltech.com.br/v22.0/{waba_id}/message_templates?name={nome}
DELETE https://whatsapp-auth.pontaltech.com.br/v22.0/{waba_id}/message_templates?hsm_id={id}&name={nome}
```

### 5.5 Buscar Template por ID
```http
GET https://whatsapp-auth.pontaltech.com.br/v22.0/{template_id}
```

**Limite:** máximo 250 templates por conta WABA.

**Verificar status via curl:**
```sh
curl -X GET 'https://whatsapp-api.pontaltech.com.br/v22.0/{waba_id}/message_templates' \
-H 'Authorization: Bearer <token>'
```

> Para estrutura completa de templates com mídia, botões, OTP e catálogo, ver `references/templates-avancados.md`

---

## 6. Webhooks / Callbacks

### 6.1 Registrar Webhook (global)
```http
POST https://whatsapp-auth.pontaltech.com.br/webhook/{waba_id}
Authorization: Bearer {token}
Content-Type: application/json

{ "webhook": "https://sua-plataforma.com/webhook/whatsapp" }
```
Resposta: `{ "success": true }` — 1 webhook por WABA; registrar novamente substitui.

### 6.2 Buscar Webhook de WABA Específica
```http
GET https://whatsapp-auth.pontaltech.com.br/webhook/{waba_id}
Authorization: Bearer {token}
```

### 6.3 Registrar Webhook para WABA Específica
```http
POST https://whatsapp-auth.pontaltech.com.br/webhook/{waba_id}/specific
Authorization: Bearer {token}
Content-Type: application/json

{ "webhook": "https://sua-plataforma.com/webhook/whatsapp" }
```

### 6.4 Deletar Webhook de WABA Específica
```http
DELETE https://whatsapp-auth.pontaltech.com.br/webhook/{waba_id}
Authorization: Bearer {token}
```

### 6.5 Boas Práticas de Webhooks
- Responder **HTTP 200 imediatamente** e processar de forma assíncrona
- **Idempotência:** usar `wamid` como chave de deduplicação (eventos podem se repetir)
- **Ordenação:** usar `timestamp` para determinar sequência real dos status
- Manter **logs completos** de todos os eventos
- **Validar assinatura** do webhook para segurança

> Para payloads completos de todos os tipos de callback, ver `references/callbacks.md`

---

## 7. Números de Telefone

### 7.1 Listar Números
```http
GET https://whatsapp-auth.pontaltech.com.br/v22.0/{waba_id}/phone_numbers
Authorization: Bearer {token}
```

**Campos retornados:** `verified_name`, `display_phone_number`, `id`, `quality_rating` (Green/Yellow/Red/NA)

### 7.2 Buscar Número por ID
```http
GET https://whatsapp-auth.pontaltech.com.br/v22.0/{phone_number_id}
Authorization: Bearer {token}
```

### 7.3 Registrar Número (sequência obrigatória)

**Passo 1 — Solicitar código de verificação:**
```http
POST https://whatsapp-auth.pontaltech.com.br/v22.0/{phone_number_id}/request_code
Authorization: Bearer {token}
Content-Type: application/json

{ "code_method": "SMS", "locale": "pt_BR" }
```
`code_method`: `SMS` ou `VOICE`

**Passo 2 — Verificar código:**
```http
POST https://whatsapp-auth.pontaltech.com.br/v22.0/{phone_number_id}/verify_code
Authorization: Bearer {token}
Content-Type: application/json

{ "code": "123456" }
```

**Passo 3 — Registrar:**
```http
POST https://whatsapp-auth.pontaltech.com.br/v22.0/{phone_number_id}/register
Authorization: Bearer {token}
Content-Type: application/json

{ "messaging_product": "whatsapp", "pin": "123456" }
```

### 7.4 Cancelar Registro
```http
POST https://whatsapp-auth.pontaltech.com.br/v22.0/{phone_number_id}/deregister
Authorization: Bearer {token}
```

### 7.5 Alterar PIN de Verificação em 2 Etapas
```http
POST https://whatsapp-auth.pontaltech.com.br/v22.0/{phone_number_id}
Authorization: Bearer {token}
Content-Type: application/json

{ "pin": "novo_pin_6_digitos" }
```

**Número do WhatsApp:** o cliente pode comprar número diretamente com a Meta **ou** a Pontaltech pode fornecer (cobrança mensal conforme tarifa negociada com o Gestor comercial).

---

## 8. Mídias — Upload e Gerenciamento

**URL base: `https://whatsapp-media-api.pontaltech.com.br`**

### 8.1 Processo de Upload (3 passos)

**Passo 1 — Gerar sessão de upload:**
```http
POST https://whatsapp-media-api.pontaltech.com.br/generate-session-upload
Authorization: Bearer {token}
Content-Type: application/json

{
  "file_name": "imagem.png",
  "file_length": "105428",
  "file_type": "image/png"
}
```
Resposta: `{ "id": "upload:MTphdHR...?sig=ARZiyIQ2..." }`

**Passo 2 — Upload do arquivo:**
```http
POST https://whatsapp-media-api.pontaltech.com.br/upload?session={session_id}
Authorization: Bearer {token}
Content-Type: image/png
Body: [binário do arquivo]
```
Resposta: `{ "h": "4:aW1hZ2VtX2F0......10:ARbvU__ocIl3qQ0UAd8" }`

O campo `h` é o **identificador de mídia** a ser usado em `header_handle` dos templates.

**Passo 3 — Usar em template:**
```json
{
  "type": "HEADER",
  "format": "IMAGE",
  "example": {
    "header_handle": ["4:aW1hZ2VtX2F0......10:ARbvU__ocIl3qQ0UAd8"]
  }
}
```

### 8.2 Outras Operações de Mídia

**Consultar informações de mídia:**
```http
GET https://whatsapp-media-api.pontaltech.com.br/{phone_number_id}/media
Authorization: Bearer {token}
```

**Baixar mídia recebida:**
```http
POST https://whatsapp-media-api.pontaltech.com.br/download_media
Authorization: Bearer {token}
Content-Type: application/json

{ "media_id": "4:aW1hZ2VtX2F0..." }
```

**Deletar mídia:**
```http
DELETE https://whatsapp-media-api.pontaltech.com.br/{phone_number_id}/media/{media_id}
Authorization: Bearer {token}
```

**Upload binário direto para URL da Meta:**
```http
POST https://whatsapp-media-api.pontaltech.com.br/upload-binary
Authorization: Bearer {token}
```

### 8.3 Tipos de Mídia e Limites

| Tipo | Formatos | Tamanho Máximo |
|------|----------|----------------|
| Imagem (JPEG/PNG, 8-bit RGB/RGBA) | .jpeg, .png | 5 MB |
| Sticker estático | .webp | 100 KB |
| Sticker animado | .webp | 500 KB |
| Vídeo (H.264 + AAC) | .3gp, .mp4 | 16 MB |
| Áudio | .aac, .amr, .mp3, .m4a, .ogg (OPUS mono) | 16 MB |
| Texto | .txt | 100 MB |
| Documentos (Excel, Word, PPT, PDF) | .xls/.xlsx, .doc/.docx, .ppt/.pptx, .pdf | 100 MB |

---

## 9. Pricing Analytics — Dashboard de Consumo

**URL base: `https://pontaltech-whatsapp-analytics.pontaltech.com.br`**

### 9.1 Autenticação (2 opções)

**Opção 1 — Via API principal:**
```http
POST https://whatsapp-auth.pontaltech.com.br/authenticate
Content-Type: application/json

{ "username": "usuario", "password": "senha" }
```

**Opção 2 — Login direto na API de analytics:**
```http
POST https://pontaltech-whatsapp-analytics.pontaltech.com.br/api/auth/login
Content-Type: application/json

{ "username": "usuario", "password": "senha" }
```
Resposta: `{ "success": true, "token": "eyJ...", "message": "Authentication successful" }`

Usar token no header: `Authorization: Bearer {token}`

**Importante:** sempre incluir `wabaId` nos parâmetros — acesso restrito à própria WABA.

### 9.2 Endpoints de Analytics

**Listar dados com filtros:**
```http
GET /api/pricing-analytics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&wabaId={waba_id}
```

**Filtros disponíveis:**
- `startDate` / `endDate` — período (máximo 1 ano)
- `wabaId` — **obrigatório**
- `country` — código do país (BR, US...)
- `phoneNumber` — número específico (ex: 5511999999999)
- `pricingType` — `MARKETING` ou `UTILITY`
- `pricingCategory` — `REGULAR`
- `status` — status da mensagem
- `tier` — faixa de pricing (ex: 0:MAX)
- `minCost` / `maxCost` — faixa de custo
- `minVolume` / `maxVolume` — faixa de volume
- `sortBy` — campo: `timestamp`, `date`, `cost`, `volume`, `waba_id`, `created_at`
- `sortOrder` — `asc` ou `desc`
- `limit` — máximo 1.000 por página
- `cursor` — para paginação cursor-based

**Resumo com agregações:**
```http
GET /api/pricing-analytics/summary?startDate=2025-12-01&endDate=2025-12-31&wabaId={waba_id}&groupBy=date,pricingType&aggregations=sum,count,avg
```

**Dados da WABA específica:**
```http
GET /api/pricing-analytics/waba/{waba_id}?startDate=2025-12-01&endDate=2025-12-31
```

**Exportar (CSV ou JSON):**
```http
GET /api/pricing-analytics/export?startDate=2025-12-01&endDate=2025-12-31&wabaId={waba_id}&format=csv&maxRecords=5000
```

### 9.3 Resposta JSON Padrão
```json
{
  "success": true,
  "data": [{
    "waba_id": "1136354904979371",
    "reference": "abc123",
    "client_id": "1446",
    "client_name": "Empresa X",
    "cost": "0.25",
    "country": "BR",
    "created_at": "2025-12-09T05:41:19.564Z",
    "date": "2025-12-10",
    "phone_number": "5514920001806",
    "pricing_category": "REGULAR",
    "pricing_type": "MARKETING",
    "status": "",
    "tier": "0:MAX",
    "timestamp": "1767244651488",
    "volume": "4",
    "waba_name": "Empresa X WABA"
  }],
  "pagination": {
    "limit": 50,
    "count": 1,
    "hasMore": false,
    "nextCursor": null,
    "totalEstimate": 1
  },
  "metadata": { "queryTime": 245, "scannedCount": 1, "cacheHit": false }
}
```

### 9.4 Limites da API de Analytics
- Período máximo: 1 ano
- Registros por página: 1.000
- Export máximo: 50.000 registros

### 9.5 Dashboard de Consumo — Super Admin

Implementar seguindo o padrão visual das demais integrações:

**Cards principais:**
- Mensagens enviadas (total de disparos)
- Mensagens entregues (volume de cobrança)
- Custo total no período (soma de `cost`)
- Templates ativos (status APPROVED)

**Tabela de Templates:**
Colunas: Nome | Categoria (Marketing/Utility/Auth) | Disparos | Volume | Custo | País | Última utilização

**Gráfico de consumo:**
- Eixo X: período com filtro diário/semanal/mensal
- Eixo Y: volume ou custo
- Separação por `pricingType` em cores distintas

**Casos de uso para o dashboard:**

```bash
# Resumo mensal por tipo de mensagem
GET /api/pricing-analytics/summary?startDate=2025-01-01&endDate=2025-12-31&wabaId=WABA_ID&groupBy=date,pricingType&aggregations=sum,count

# Por país
GET /api/pricing-analytics/summary?...&groupBy=country&aggregations=sum,avg,count

# Export CSV
GET /api/pricing-analytics/export?...&format=csv&maxRecords=10000
```

---

## 10. Rate Limiting e Boas Práticas

### 10.1 Limites do WAF (por IP)
- **15 requisições GET por 5 minutos**
- **10 requisições de autenticação por 5 minutos** (`/authenticate`)
- **Bloqueio automático após 20 erros (400/401/404) por IP em 5 minutos**

### 10.2 Códigos de Erro HTTP

| Código | Significado | Ação |
|--------|-------------|------|
| 400 | Bad Request — payload inválido | Verificar corpo da requisição |
| 401 | Token inválido/expirado | Renovar token via `/authenticate` |
| 403 | Acesso negado | Verificar permissões |
| 404 | Recurso não encontrado | Verificar URL e IDs |
| 418 / 429 | Rate limit excedido | Backoff exponencial |
| 500 | Erro interno | Tentar novamente depois |
| 503 | Serviço indisponível | Tentar novamente depois |

### 10.3 Backoff Exponencial (implementar)
```javascript
async function makeRequestWithBackoff(url, options, maxRetries = 3) {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429 || response.status === 418) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}
```

### 10.4 Circuit Breaker (implementar para produção)
```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) throw new Error('Circuit breaker is OPEN');
      this.state = 'HALF_OPEN';
    }
    try {
      const result = await fn();
      this.failureCount = 0;
      this.state = 'CLOSED';
      return result;
    } catch (error) {
      this.failureCount++;
      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.timeout;
      }
      throw error;
    }
  }
}
```

### 10.5 Boas Práticas Gerais
- **Templates:** aguardar aprovação antes de usar; categorização correta impacta custo
- **Janela de 24h:** só enviar texto livre se usuário respondeu nas últimas 24h
- **Webhooks:** sempre responder HTTP 200; processar assincronamente; implementar retry
- **Mídias:** comprimir antes do upload; usar nomes descritivos; manter controle dos `h` IDs
- **Horários:** respeitar horários comerciais; não sobrecarregar usuários
- **Frequência:** não acumular 20 erros 4xx em 5 minutos (bloqueio de IP)

---

## 11. Suporte

- Email Pontaltech: **apoio.ca@pontaltech.com.br**
- Documentação completa: https://rich-communication-docs.pontaltech.com.br/docs/pt-br/whatsapp/introducao
- Documentação Meta (webhooks): https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview

---

## Referências Detalhadas

| Arquivo | Conteúdo |
|---------|----------|
| `references/mensagens-avancadas.md` | Mídias em mensagens, interativos, listas, botões, respostas rápidas |
| `references/templates-avancados.md` | Templates com mídia, OTP, catálogo, MPM, botões CTA, exemplos completos |
| `references/callbacks.md` | Payloads completos de todos os tipos de callback/webhook |

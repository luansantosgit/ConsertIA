# Templates Avançados — WhatsApp Pontaltech

Endpoint: `POST https://whatsapp-auth.pontaltech.com.br/v22.0/{waba_id}/message_templates`
Header: `Authorization: Bearer {token}`

---

## Template Simples (Texto)

```json
{
  "name": "boas_vindas",
  "language": "pt_BR",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Bem-vindo à {{1}}!",
      "example": { "header_text": ["Empresa X"] }
    },
    {
      "type": "BODY",
      "text": "Olá {{1}}, sua conta foi criada com sucesso. Acesse com o e-mail {{2}}.",
      "example": { "body_text": [["João", "joao@email.com"]] }
    },
    { "type": "FOOTER", "text": "Suporte disponível 24h" }
  ]
}
```

---

## Template com Imagem no Header

```json
{
  "name": "promocao_sazonal_imagem",
  "language": "pt_BR",
  "category": "MARKETING",
  "components": [
    {
      "type": "HEADER",
      "format": "IMAGE",
      "example": {
        "header_handle": ["4:aW1hZ2VtX2F0......10:ARbvU__ocIl3qQ0UAd8"]
      }
    },
    {
      "type": "BODY",
      "text": "Aproveite! Use {{1}} e ganhe {{2}} de desconto.",
      "example": { "body_text": [["PROMO25", "25%"]] }
    },
    { "type": "FOOTER", "text": "Oferta válida até o final do mês" },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "QUICK_REPLY", "text": "Ver Ofertas" },
        { "type": "URL", "text": "Acessar Site", "url": "https://exemplo.com/promo/{{1}}", "example": ["summer2025"] }
      ]
    }
  ]
}
```

---

## Template com Documento no Header

```json
{
  "name": "confirmacao_pedido_doc",
  "language": "pt_BR",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "DOCUMENT",
      "example": {
        "header_handle": ["4:ZG9jdW1lbnRvX2V4ZW1wbG8......10:ARbvU__ocIl3qQ0UAd8"]
      }
    },
    {
      "type": "BODY",
      "text": "Obrigado {{1}}! Pedido {{2}} confirmado. Veja o comprovante em PDF.",
      "example": { "body_text": [["João", "860198-230332"]] }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "PHONE_NUMBER", "text": "Ligar", "phone_number": "5511999990000" },
        { "type": "URL", "text": "Suporte", "url": "https://exemplo.com/suporte" }
      ]
    }
  ]
}
```

---

## Template com Header de Localização

```json
{
  "name": "atualizacao_entrega",
  "language": "pt_BR",
  "category": "UTILITY",
  "components": [
    { "type": "HEADER", "format": "LOCATION" },
    {
      "type": "BODY",
      "text": "Boas notícias {{1}}! Pedido #{{2}} está a caminho do endereço acima.",
      "example": { "body_text": [["João", "566701"]] }
    },
    { "type": "FOOTER", "text": "Toque abaixo para parar as atualizações de entrega." },
    {
      "type": "BUTTONS",
      "buttons": [{ "type": "QUICK_REPLY", "text": "Parar Atualizações" }]
    }
  ]
}
```

---

## Template de Autenticação — OTP com "Copy Code"

```json
{
  "name": "codigo_verificacao_copy",
  "language": "pt_BR",
  "category": "AUTHENTICATION",
  "components": [
    { "type": "BODY", "add_security_recommendation": true },
    { "type": "FOOTER", "code_expiration_minutes": 10 },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "OTP", "otp_type": "COPY_CODE", "text": "Copiar Código" }
      ]
    }
  ]
}
```

## Template de Autenticação — OTP com "One-Tap Autofill" (Android)

```json
{
  "name": "codigo_verificacao_autofill",
  "language": "pt_BR",
  "category": "AUTHENTICATION",
  "components": [
    { "type": "BODY", "add_security_recommendation": true },
    { "type": "FOOTER", "code_expiration_minutes": 10 },
    {
      "type": "BUTTONS",
      "buttons": [{
        "type": "OTP",
        "otp_type": "ONE_TAP",
        "text": "Verificar Automaticamente",
        "autofill_text": "Preencher",
        "package_name": "com.suaempresa.app",
        "signature_hash": "SUA_HASH_AQUI"
      }]
    }
  ]
}
```

---

## Template com Catálogo

```json
{
  "name": "oferta_catalogo",
  "language": "pt_BR",
  "category": "MARKETING",
  "components": [
    {
      "type": "BODY",
      "text": "Confira nossas ofertas! Use o cupom {{1}} e ganhe {{2}}% de desconto em compras acima de {{3}}.",
      "example": { "body_text": [["PROMO10", "10", "R$100"]] }
    },
    { "type": "FOOTER", "text": "Ofertas por tempo limitado" },
    {
      "type": "BUTTONS",
      "buttons": [{ "type": "CATALOG", "text": "Ver catálogo" }]
    }
  ]
}
```

---

## Template Multi-Produto (MPM)

```json
{
  "name": "carrinho_abandonado",
  "language": "pt_BR",
  "category": "MARKETING",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "{{1}}, você esqueceu algo!",
      "example": { "header_text": ["Maria"] }
    },
    {
      "type": "BODY",
      "text": "Seus itens ainda estão no carrinho. Use {{1}} para 10% de desconto.",
      "example": { "body_text": [["VOLTA10"]] }
    },
    { "type": "BUTTONS", "buttons": [{ "type": "MPM", "text": "Ver itens" }] }
  ]
}
```

---

## Template Marketing com Texto + 2 Quick Reply + 1 URL

```json
{
  "name": "promocao_sazonal_texto",
  "language": "pt_BR",
  "category": "MARKETING",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Nossa {{1}} chegou!",
      "example": { "header_text": ["Liquidação de Inverno"] }
    },
    {
      "type": "BODY",
      "text": "Compre até {{1}} e use {{2}} para {{3}} de desconto em toda a coleção.",
      "example": { "body_text": [["31 de agosto", "INVERNO25", "25%"]] }
    },
    { "type": "FOOTER", "text": "Use os botões abaixo para gerenciar suas preferências de marketing" },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "QUICK_REPLY", "text": "Cancelar promoções" },
        { "type": "QUICK_REPLY", "text": "Cancelar todos os envios" },
        { "type": "URL", "text": "Ver coleção", "url": "https://loja.exemplo.com/colecao" }
      ]
    }
  ]
}
```

---

## Template com Vídeo no Header + CTA

```json
{
  "name": "lancamento_produto_video",
  "language": "pt_BR",
  "category": "MARKETING",
  "components": [
    {
      "type": "HEADER",
      "format": "VIDEO",
      "example": {
        "header_handle": ["4:dmlkZW9fZXhlbXBsbw......10:ARbvU__ocIl3qQ0UAd8"]
      }
    },
    {
      "type": "BODY",
      "text": "Olá {{1}}! Lançamento exclusivo: {{2}} por apenas {{3}}.",
      "example": { "body_text": [["Carlos", "Produto Premium", "R$199"]] }
    },
    { "type": "FOOTER", "text": "Oferta por tempo limitado" },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "PHONE_NUMBER", "text": "Ligar Agora", "phone_number": "5511999990000" },
        { "type": "URL", "text": "Comprar Agora", "url": "https://loja.exemplo.com/produto/{{1}}", "example": ["premium-2025"] }
      ]
    }
  ]
}
```

---

## Variáveis em Templates

- Sintaxe: `{{1}}`, `{{2}}`, `{{3}}`...
- Sempre fornecer `example` no payload de criação para acelerar aprovação
- Variáveis devem ser substituídas no envio via `components[].parameters`
- Não usar variáveis no início ou fim do template (erro 2388299)
- Verificar proporção variáveis/texto — muitas variáveis em texto curto gera erro 2388293

---

## Boas Práticas de Templates

- Usar linguagem profissional e objetiva
- Incluir informações de contato quando relevante
- Evitar spam ou excesso de emojis
- Revisar antes de submeter — rejeição atrasa o uso
- Templates `DISABLED` (muitas rejeições por baixa qualidade) não podem ser reativados — criar novo com conteúdo diferente
- Templates `PAUSED` (baixa qualidade) podem ser editados e resubmetidos

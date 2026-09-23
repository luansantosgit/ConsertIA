# Mensagens Avançadas — WhatsApp Pontaltech

URL: `POST https://whatsapp-auth.pontaltech.com.br/v22.0/{phone_number_id}/messages`
Header: `Authorization: Bearer {token}`

---

## Template com Mídia no Header

### Header de Imagem
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "promo_com_imagem",
    "language": { "code": "pt_BR" },
    "components": [
      {
        "type": "header",
        "parameters": [
          { "type": "image", "image": { "link": "https://url-da-imagem.com/foto.jpg" } }
        ]
      },
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "João" },
          { "type": "currency", "currency": { "fallback_value": "R$99,90", "code": "BRL", "amount_1000": 99900 } },
          { "type": "date_time", "date_time": { "fallback_value": "25 de Fevereiro de 2025" } }
        ]
      }
    ]
  }
}
```

### Header de Documento
```json
{
  "type": "header",
  "parameters": [
    { "type": "document", "document": { "link": "https://url.com/arquivo.pdf", "filename": "catalogo.pdf" } }
  ]
}
```

### Header de Vídeo
```json
{
  "type": "header",
  "parameters": [
    { "type": "video", "video": { "link": "https://url.com/video.mp4" } }
  ]
}
```

---

## Template com Botões Interativos

### Quick Reply (resposta rápida — usuário toca e envia payload)
```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "confirmacao_pedido",
    "language": { "code": "pt_BR" },
    "components": [
      { "type": "body", "parameters": [{ "type": "text", "text": "João" }] },
      { "type": "button", "sub_type": "quick_reply", "index": "0", "parameters": [{ "type": "payload", "payload": "CONFIRMAR" }] },
      { "type": "button", "sub_type": "quick_reply", "index": "1", "parameters": [{ "type": "payload", "payload": "CANCELAR" }] }
    ]
  }
}
```

### Call-to-Action — URL Dinâmica
```json
{
  "type": "button",
  "sub_type": "url",
  "index": "0",
  "parameters": [{ "type": "text", "text": "parametro-dinamico" }]
}
```

### Call-to-Action — Ligação Telefônica
```json
{
  "type": "button",
  "sub_type": "phone_number",
  "index": "0",
  "parameters": [{ "type": "phone_number", "phone_number": "5511999999999" }]
}
```

---

## Mensagem Interativa com Lista (texto livre — janela 24h)

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999999999",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": { "type": "text", "text": "Selecione uma opção" },
    "body": { "text": "Escolha o departamento desejado:" },
    "footer": { "text": "Atendimento 24h" },
    "action": {
      "button": "Ver opções",
      "sections": [
        {
          "title": "Suporte",
          "rows": [
            { "id": "SUP_TECNICO", "title": "Suporte Técnico", "description": "Problemas com o sistema" },
            { "id": "SUP_FINANCEIRO", "title": "Financeiro", "description": "Boletos e pagamentos" }
          ]
        },
        {
          "title": "Comercial",
          "rows": [
            { "id": "COM_VENDAS", "title": "Vendas", "description": "Novos planos e upgrades" }
          ]
        }
      ]
    }
  }
}
```

### Responder Lista com Contexto
Adicionar `"context": { "message_id": "<WAMID_ANTERIOR>" }` no nível raiz do payload.

---

## Mensagem Interativa com Botões (tipo button — janela 24h)

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999999999",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": { "text": "Confirma seu agendamento para amanhã às 14h?" },
    "action": {
      "buttons": [
        { "type": "reply", "reply": { "id": "CONFIRMAR", "title": "✅ Confirmar" } },
        { "type": "reply", "reply": { "id": "CANCELAR", "title": "❌ Cancelar" } },
        { "type": "reply", "reply": { "id": "REAGENDAR", "title": "🔄 Reagendar" } }
      ]
    }
  }
}
```

---

## Mensagem de Texto com Preview de URL

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999999999",
  "type": "text",
  "text": {
    "preview_url": true,
    "body": "Confira nossa promoção: https://www.seusite.com/promo"
  }
}
```

---

## Tipos MIME Suportados para Upload

| Tipo | MIME | Tamanho |
|------|------|---------|
| JPEG | image/jpeg | 5 MB |
| PNG | image/png | 5 MB |
| WebP estático | image/webp | 100 KB |
| WebP animado | image/webp | 500 KB |
| MP4 (H.264+AAC) | video/mp4 | 16 MB |
| 3GPP | video/3gpp | 16 MB |
| AAC | audio/aac | 16 MB |
| AMR | audio/amr | 16 MB |
| MP3 | audio/mpeg | 16 MB |
| M4A | audio/mp4 | 16 MB |
| OGG (OPUS mono) | audio/ogg | 16 MB |
| TXT | text/plain | 100 MB |
| XLS/XLSX | application/vnd.ms-excel | 100 MB |
| DOC/DOCX | application/msword | 100 MB |
| PPT/PPTX | application/vnd.ms-powerpoint | 100 MB |
| PDF | application/pdf | 100 MB |

Para verificar MIME no Linux: `file -I nome-do-arquivo`

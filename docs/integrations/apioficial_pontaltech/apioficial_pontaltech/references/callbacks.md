# Callbacks (Webhooks) — WhatsApp Pontaltech

A Pontaltech repassa os callbacks da Meta **sem modificação**.

## Estrutura Base de Todos os Callbacks

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "<WABA_ID>",
    "changes": [{
      "value": { ... },
      "field": "messages"
    }]
  }]
}
```

**Parâmetros comuns:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `object` | String | Sempre "whatsapp_business_account" |
| `entry` | Array | Array de entradas com mudanças |
| `id` | String | ID da conta de negócios |
| `changes` | Array | Array de mudanças ocorridas |
| `value` | Object | Dados da mudança |
| `messaging_product` | String | Sempre "whatsapp" |
| `metadata` | Object | Número de telefone e phone_number_id |
| `timestamp` | String | Unix timestamp do evento |

---

## 1. Status de Mensagem

Disparado quando a mensagem é enviada, entregue, lida ou falha.

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "8856996819413533",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "16505553333",
          "phone_number_id": "27681414235104944"
        },
        "statuses": [{
          "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
          "status": "delivered",
          "timestamp": "1603086313",
          "recipient_id": "16315551234"
        }]
      },
      "field": "messages"
    }]
  }]
}
```

**Valores de `status`:**
- `sent` — chegou ao servidor WhatsApp
- `delivered` — chegou ao dispositivo (**status de cobrança**)
- `read` — usuário abriu
- `failed` — falha (contém array `errors` com código e detalhes)

**Callback de falha:**
```json
{
  "statuses": [{
    "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
    "status": "failed",
    "timestamp": "1603086313",
    "recipient_id": "16315551234",
    "errors": [{
      "code": 131026,
      "title": "Message undeliverable",
      "message": "User's phone number is not a WhatsApp number",
      "error_data": {
        "details": "The recipient's phone number is not registered on WhatsApp"
      }
    }]
  }]
}
```

---

## 2. Mensagem de Texto Recebida

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "8856996819413533",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "16505553333",
          "phone_number_id": "27681414235104944"
        },
        "contacts": [{
          "profile": { "name": "Kerry Fisher" },
          "wa_id": "16315551234"
        }],
        "messages": [{
          "from": "16315551234",
          "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
          "timestamp": "1603086313",
          "text": { "body": "Olá, preciso de ajuda" },
          "type": "text"
        }]
      },
      "field": "messages"
    }]
  }]
}
```

---

## 3. Mensagem com Imagem Recebida

```json
{
  "messages": [{
    "from": "<FROM_PHONE_NUMBER>",
    "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
    "timestamp": "1603086313",
    "image": {
      "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
      "mime_type": "image/jpeg",
      "sha256": "sha256_hash",
      "caption": "Imagem enviada"
    },
    "type": "image"
  }]
}
```

Para baixar a mídia recebida, usar o `id` em:
`POST https://whatsapp-media-api.pontaltech.com.br/download_media` com `{ "media_id": "<id>" }`

---

## 4. Mensagem com Vídeo Recebida

```json
{
  "messages": [{
    "from": "<FROM_PHONE_NUMBER>",
    "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
    "timestamp": "1603086313",
    "video": {
      "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
      "mime_type": "video/mp4",
      "sha256": "sha256_hash",
      "caption": "Vídeo enviado"
    },
    "type": "video"
  }]
}
```

---

## 5. Mensagem com Áudio Recebida

```json
{
  "messages": [{
    "from": "<FROM_PHONE_NUMBER>",
    "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
    "timestamp": "1603086313",
    "audio": {
      "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
      "mime_type": "audio/ogg; codecs=opus",
      "sha256": "sha256_hash"
    },
    "type": "audio"
  }]
}
```

---

## 6. Mensagem com Documento Recebida

```json
{
  "messages": [{
    "from": "<FROM_PHONE_NUMBER>",
    "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
    "timestamp": "1603086313",
    "document": {
      "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
      "mime_type": "application/pdf",
      "sha256": "sha256_hash",
      "filename": "documento.pdf",
      "caption": "Documento enviado"
    },
    "type": "document"
  }]
}
```

---

## 7. Mensagem com Sticker Recebida

```json
{
  "messages": [{
    "from": "<FROM_PHONE_NUMBER>",
    "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
    "timestamp": "1603086313",
    "sticker": {
      "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
      "mime_type": "image/webp",
      "sha256": "sha256_hash"
    },
    "type": "sticker"
  }]
}
```

---

## 8. Mensagem com Localização Recebida

```json
{
  "messages": [{
    "from": "<FROM_PHONE_NUMBER>",
    "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
    "timestamp": "1603086313",
    "location": {
      "latitude": 37.785834,
      "longitude": -122.406417,
      "name": "San Francisco",
      "address": "San Francisco, CA, USA"
    },
    "type": "location"
  }]
}
```

---

## 9. Mensagem com Contato Recebida

```json
{
  "messages": [{
    "from": "<FROM_PHONE_NUMBER>",
    "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
    "timestamp": "1603086313",
    "contacts": [{
      "name": {
        "formatted_name": "John Doe",
        "first_name": "John",
        "last_name": "Doe"
      },
      "phones": [{ "phone": "+1234567890", "type": "MOBILE" }]
    }],
    "type": "contacts"
  }]
}
```

---

## 10. Reação Recebida

```json
{
  "messages": [{
    "from": "sender_wa_id",
    "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
    "timestamp": "1603086313",
    "reaction": {
      "message_id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
      "emoji": "👍"
    },
    "type": "reaction"
  }]
}
```

**Nota:** reações em mensagens com mais de 30 dias não geram evento.

---

## 11. Interação com Botão de Resposta (Quick Reply)

```json
{
  "messages": [{
    "from": "<FROM_PHONE_NUMBER>",
    "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
    "timestamp": "1603086313",
    "interactive": {
      "type": "button_reply",
      "button_reply": {
        "id": "CONFIRMAR",
        "title": "✅ Confirmar"
      }
    },
    "type": "interactive"
  }]
}
```

---

## 12. Interação com Lista (Opção Selecionada)

```json
{
  "messages": [{
    "from": "<FROM_PHONE_NUMBER>",
    "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
    "timestamp": "1603086313",
    "interactive": {
      "type": "list_reply",
      "list_reply": {
        "id": "SUP_TECNICO",
        "title": "Suporte Técnico",
        "description": "Problemas com o sistema"
      }
    },
    "type": "interactive"
  }]
}
```

---

## 13. Pedido Criado pelo Cliente (Catálogo)

```json
{
  "messages": [{
    "from": "<FROM_PHONE_NUMBER>",
    "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
    "timestamp": "1603086313",
    "order": {
      "id": "order_id",
      "catalog_id": "catalog_id",
      "product_items": [{
        "product_retailer_id": "product_id",
        "quantity": 1,
        "item_price": 10.00,
        "currency": "USD"
      }]
    },
    "type": "order"
  }]
}
```

---

## 14. Mudança de Número do Usuário (Evento de Sistema)

```json
{
  "messages": [{
    "from": "<FROM_PHONE_NUMBER>",
    "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
    "timestamp": "1603086313",
    "system": {
      "body": "O usuário mudou de número",
      "type": "user_changed_number"
    },
    "type": "system"
  }]
}
```

---

## 15. Click to WhatsApp Ads

```json
{
  "messages": [{
    "from": "<FROM_PHONE_NUMBER>",
    "id": "wamid.ID",
    "timestamp": "1603086313",
    "context": {
      "from": "ad_click",
      "id": "ad_id"
    },
    "type": "text",
    "text": { "body": "Mensagem do usuário ao clicar no anúncio" }
  }]
}
```

---

## 16. Mensagem Desconhecida / Não Suportada

```json
{
  "messages": [{
    "from": "<FROM_PHONE_NUMBER>",
    "id": "wamid.gBGGFlCGg0cvAglAxydbAoy-gwNo",
    "timestamp": "1603086313",
    "type": "unknown"
  }]
}
```

---

## Processamento de Callbacks — Regras Essenciais

1. **Responder HTTP 200 imediatamente** — processar payload de forma assíncrona
2. **Idempotência** — mesmo evento pode chegar mais de uma vez; usar `id` (wamid) como chave de deduplicação
3. **Ordenação** — status `sent→delivered→read` podem chegar fora de ordem; usar `timestamp` para sequência real
4. **Logs completos** — registrar todos os eventos com timestamp para auditoria e rastreamento
5. **Retry logic** — implementar reprocessamento em caso de falha interna
6. **Validar assinatura** do webhook para segurança

## Campos para Persistir (por mensagem enviada)

Para cruzamento com pricing analytics e rastreamento:

```
wamid | status | timestamp | recipient_id | phone_number_id | template_name | category | waba_id
```

Filtrar `status = "delivered"` para calcular volume de cobrança.

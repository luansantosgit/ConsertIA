# Push Notifications + Badge + Preview — DeeperIA PWA

## Goal
Implementar push notifications para o PWA DeeperIA com:
1. **Notificações com preview** na barra de notificações do celular (titulo + corpo da mensagem + ação para abrir conversa)
2. **Badge (contador) no ícone do app instalado** com a qtd de mensagens não lidas (estilo WhatsApp)

## Arquitetura (frontend + backend)

```
┌─────────────────────────────────────────────────────────────┐
│  PWA (React + Vite)                                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Badge API: navigator.setAppBadge(n) / clearAppBadge()│  │
│  │  Atualizado ao receber push + zerado ao abrir conversa│  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  VAPID subscribe → Salvar subscription no Supabase     │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Service Worker: push event → showNotification()       │  │
│  │    - titulo: nome do cliente / número                  │  │
│  │    - body: preview da mensagem                          │  │
│  │    - badge: ícone da marca                             │  │
│  │    - actions: ["Abrir conversa"] com data {conversaId}│  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────▲───────────────────────▲────────────────┘
                      │                       │
              (Edge Function send-push)      │
                      │                       │
┌─────────────────────▼───────────────────────▼────────────────┐
│  Supabase Edge Functions                                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  send-push-notification: recebe {title, body, tenantId,│  │
│  │   conversaId, url?}                                    │  │
│  │  - Lê todas as subscriptions da tenant da tabela       │  │
│  │  - Usa web-push + VAPID para enviar                    │  │
│  │  - Deleta subscription expirada (404)                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Tasks

- [ ] **1. Gerar par de chaves VAPID** — `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` no `.env`; `VAPID_PUBLIC_KEY` injetado no `vite.config.ts` via `define.VAPID_PUBLIC_KEY`. Verificar no DOM.

- [ ] **2. Criar tabela `push_subscriptions` no Supabase** — migration `YYYYMMDDHHMMSS_create_push_subscriptions.sql`: `id`, `tenant_id`, `endpoint`, `p256dh`, `auth`, `created_at`. RLS: `tenant_id` isolation via `auth.jwt() ->> 'tenant_id'`. Testar com `supabase db push --linked`.

- [ ] **3. Edge Function `send-push-notification`** — `supabase functions create send-push-notification` com `--no-verify-jwt`:
   - Recebe `{ title, body, tenantId, conversaId?, url? }`
   - Lê subscriptions da tabela
   - Envia via `web-push` com VAPID
   - Deleta subscription expirada

- [ ] **4. Hook `usePushSubscription`** — `src/lib/push-subscription.ts`:
   - `requestPermission()` → `Notification.requestPermission()`
   - `subscribe()` → `registration.pushManager.subscribe()` + salva no Supabase
   - `setBadge(n)` → `navigator.setAppBadge(n)` / `clearAppBadge()`
   - `clearBadge()` → `navigator.clearAppBadge()`

- [ ] **5. Componente `PushPermissionModal`** — Modal `modal-overlay`/`modal/` com:
   - Texto: "Quer receber lembretes de novas mensagens?"
   - Botão "Permitir" → chama `subscribe()`
   - Botão "Não, obrigado" → fecha sem subscrever
   - Guarda preferência para não perguntar novamente

- [ ] **6. Integrar no onboarding / settings** — Chamar modal após criar primeira OS ou em `⚙️ → Notificações`. Persistir preferência.

- [ ] **7. Badge na tela de conversas** — Ler total de mensagens não lidas da conversa atual (ou global) e chamar `setBadge(n)` / `clearAppBadge()` ao montar/ao receber push.

- [ ] **8. Service Worker — evento push** — Adicionar `self.addEventListener('push', ...)` em `public/sw.js` com `showNotification(título, { body, icon, badge, data: {conversaId, url}, actions: [...] })`.

- [ ] **9. Clique na notificação** — `notificationclick` handler no SW que foca/janela a conversa (ou `/atendimento`) e limpa o badge.

- [ ] **10. Testes** — Unit: `usePushSubscription` mocka `Notification.requestPermission`; integração: edge function `200`; manual: `chrome://serviceworker-internals`, notification aparece com app fechado.

- [ ] **11. Documentação no `AGENTS.md`** — Como gerar/rotacionar chaves VAPID, como testar, dados armazenados.

## Done When
- [ ] Chaves VAPID geradas e injetadas no bundle (build verde)
- [ ] Tabela `push_subscriptions` criada com RLS
- [ ] Edge function `send-push-notification` deployada (`--no-verify-jwt`) e retorna `200`
- [ ] `PushPermissionModal` renderizado e funcional
- [ ] Badge aparece no ícone do app instalado (`setAppBadge`)
- [ ] Notificação com preview aparece na barra de notificações do celular
- [ ] Clique na notificação abre a conversa e zera o badge
- [ ] 100% dos testes passam (`npx vitest run --pool=threads`)

## Risco / Mitigação
| Risco | Mitigação |
|------|-----------|
| Permissão negada pelo usuário | Modal com CTA "Como ativar nas configurações"; não pergunta novamente se já disseram "não" |
| Badge API não suportada (iOS/Safari) | `try/catch` silencioso; fallback apenas preview da notificação |
| Subscription expirada | Edge function detecta 404 e deleta da tabela; fluxo "reautorizar" no modal |
| Chaves VAPID expostas | Chave pública só no frontend; privada no `.env` server-side |

## Dependências
- `web-push` (`npm i web-push`)
- `public/sw.js` já existe — só adicionar `push` e `notificationclick`
- Padrões de edge functions já estabelecidos (`--no-verify-jwt`, `_shared`)

## Próximos passos (após aprovação)
1. `npm i web-push`
2. Gerar chaves VAPID
3. Criar migration + edge function
4. Criar hook + componente + integração SW
5. Testar end-to-end
6. Commit + push + PR #86
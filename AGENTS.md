# DeeperIA - Agent Instructions

## Project Overview

DeeperIA is a multi-tenant CRM + AI system for technical assistance (repair shops).
Stack: React 19, TypeScript, Vite, Tailwind v4, Zustand, React Router v7, i18next, Supabase.

---

## Database Access (Supabase)

### Connection
- **URL**: `https://sknimzjwpdbcuutxbycq.supabase.co`
- **Project ref**: `sknimzjwpdbcuutxbycq`
- **Credentials**: `.env` file (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- **Service role key**: Use only in server-side scripts (never in frontend code)

### Architecture Rule: Repository Pattern
**Front NEVER talks directly to Supabase.** All DB access goes through the Data Access Layer.

```
src/repositories/base.ts                  -> BaseSupabaseRepository<T> (abstract)
src/repositories/customer.repository.ts
src/repositories/service-order.repository.ts
src/repositories/product.repository.ts
src/repositories/conversation.repository.ts
src/repositories/message.repository.ts
src/repositories/transaction.repository.ts
src/repositories/calendar-event.repository.ts
src/repositories/lead.repository.ts
src/repositories/equipment.repository.ts
src/repositories/stock-movement.repository.ts
src/repositories/tenant.repository.ts
src/repositories/ai-config.repository.ts
src/repositories/ai-log.repository.ts
src/repositories/tenant-theme.repository.ts
src/repositories/tenant-settings.repository.ts
src/repositories/plan.repository.ts
src/repositories/user.repository.ts
```

### How to Add/Modify DB Schema

1. Create a new migration file in `supabase/migrations/` with format: `YYYYMMDDHHMMSS_description.sql`
2. Use `gen_random_uuid()` for UUIDs (NOT `uuid_generate_v4()`)
3. Use `DO $$ ... end $$;` for PL/pgSQL blocks (NOT `do begin ... end;`)
4. Always add `IF NOT EXISTS` for idempotent migrations
5. Push with: `supabase db push --linked`
6. Test by querying via Supabase client in a script

### Edge Functions Deployment - MANDATORY RULE
Edge Functions que recebem webhooks de terceiros (especialmente **`uazapi-webhook`**) **DEVEM ser deployadas SEMPRE com a flag `--no-verify-jwt`**:

```bash
supabase functions deploy uazapi-webhook --no-verify-jwt
```

> **ATENÇÃO CRÍTICA:** Se a função `uazapi-webhook` for deployada sem `--no-verify-jwt`, o Supabase exigirá token JWT Authorization Bearer. Como a API/servidores da Uazapi enviam webhooks públicos sem credencial JWT de usuário Supabase, todas as chamadas recebem **401 Unauthorized** e **o sistema para de receber e entregar qualquer mensagem enviada pelos leads**.

### Deploy das Edge Functions
- `uazapi-webhook`: `supabase functions deploy uazapi-webhook --no-verify-jwt`
- `api-oficial-send`: `supabase functions deploy api-oficial-send`
- `ligacoes-auth`: `supabase functions deploy ligacoes-auth`
- `process-scheduled-messages`: `supabase functions deploy process-scheduled-messages --no-verify-jwt`
- `superadmin-reset-password`: `supabase functions deploy superadmin-reset-password` — superadmin regera senha do admin de um tenant (service_role; usada no modal "Empresas")
- `renew-user-password`: `supabase functions deploy renew-user-password` — admin do tenant renova a senha de um usuario da equipe (senha gerada no servidor; admin nao digita a senha de terceiros)
- `wizard-finalize`: `supabase functions deploy wizard-finalize` — superadmin finaliza wizard manual para empresa não completada (creates usuário, marca como paid, ativa tenant). **ATENÇÃO (v1.0.114)**: ao reutilizar um auth user existente (lead que começou o wizard e desistiu), o realinhamento do `user_metadata.tenant_id`/role é OBRIGATÓRIO (`syncAdminMetadata` em `_shared/admin-users.ts`) — as policies RLS usam esse claim; sem ele o login falha com "Perfil de usuário não encontrado no sistema". A senha exibida no modal sempre vem de `session.temp_password` (persistida ANTES do `finalizeOnboarding`, que exibe esse valor).
- `public-signup`: wizard /comece-agora — inclui action `support` (pública) que devolve `platform_settings.support_whatsapp` para o balão de suporte
- **ATENÇÃO — defaults de IA por tenant (v1.0.117)**: SEM linha em `ai_agent_settings` o agente **não roda** (`loadAgentSettings` → `if (!agentRes.data) return null`). Tenant novo (wizard **ou** criado pelo superadmin) deve usar `ensureAiDefaults()` de `_shared/ai-defaults.ts`: cria a row com `active: true`, `ask_name_enabled: true` e `openrouter_model` = modelo liberado (`resolveDefaultModel` espelha o `resolveEffectiveModel` do runtime). Defaults do banco e migration `20261102210000_ai_agent_defaults.sql` mantêm o mesmo comportamento. "Lista liberada" = `platform_ai_config.allowed_models` (modo `all`) ou `tenant_ai_entitlements.allowed_models` (modo `selected`) — **não** é a cota de tokens do plano (`plans.ai_token_limit`).

### How to Add a New Repository

1. Create `src/repositories/[entity].repository.ts`
2. Extend `BaseSupabaseRepository<T>`
3. Get `tenantId` from `useAuthStore.getState().user?.tenantId`
4. Filter all queries by `tenant_id`
5. Implement: `getById`, `getAll`, `create`, `update`, `delete`
6. Add entity-specific methods as needed

### Tenant Isolation
- Every table has `tenant_id uuid` column
- RLS policies enforce isolation via `auth.jwt() ->> 'tenant_id'`
- Superadmin bypasses RLS via `auth.jwt() ->> 'role' = 'superadmin'`
- Repositories always filter by current user's `tenantId`

### Auth Flow
1. Login: `supabase.auth.signInWithPassword()` -> fetch user profile from `users` table -> fetch tenant name from `tenants` table
2. Session restore: `supabase.auth.getSession()` on app boot via `initSession()`
3. Logout: `supabase.auth.signOut()`

### Database Tables (17 total)
`tenants`, `users`, `plans`, `tenant_themes`, `customers`, `equipment`, `service_orders`, `products`, `stock_movements`, `leads`, `conversations`, `messages`, `transactions`, `calendar_events`, `ai_configs`, `ai_logs`, `tenant_settings`

### Demo Users (created in Supabase Auth)
| Email | Password | Role |
|-------|----------|------|
| contatoGrupolssolucoes@gmail.com | 123456 | superadmin |
| admin@gmail.com | 123456 | admin |
| admin@fixtech.com | 123456 | admin |

---

## Development Rules

### 1. GitHub Workflow
- **ALL tasks** (bug fixes, improvements, new features) MUST have a GitHub Issue created first
- Work in feature branches, never directly on `main`
- Create Pull Requests for all changes
- **Always mention the Issue** in the PR description (e.g., "Closes #12")
- Use conventional commit messages: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`

### 2. UI/UX Principles (Motion Design)
Every interface element MUST have:

- **Skeleton loading**: Show skeleton placeholders while content loads (no blank screens)
- **Lazy loading**: Use `React.lazy()` and `Suspense` for route-level code splitting
- **Smooth animations**: Entry/exit transitions on all modals, drawers, toasts, and page changes
- **Loading states**: Spinner or progress bar for every async operation
- **Progress indicators**: For file uploads, multi-step processes, and long operations
- **Empty states**: Friendly message + CTA when no data is available
- **Error states**: Clear error message + retry button

### 2.1 Confirmation Modals - MANDATORY
**NEVER use browser native `confirm()`, `alert()`, or `prompt()`.** All confirmation dialogs MUST use the project's native `ConfirmModal` component (`src/components/ConfirmModal.tsx`). This ensures:
- Consistent visual identity across the app
- Proper animations and transitions
- Mobile-friendly UX
- Accessibility compliance

**Every async destructive action** (delete, disconnect, remove, archive) MUST show a `ConfirmModal` before executing.

### 2.2 Front-end Reuse - MANDATORY
**Tudo que já existe como padrão visual DEVE ser reutilizado — NUNCA crie outro modelo paralelo.** Isso evita discrepância visual entre páginas. Antes de criar qualquer coisa nova:
- **Botões**: usar sempre as classes existentes (`btn`, `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`, `btn-sm`, `btn-pill`) — nunca estilizar botão do zero se a classe existe
- **Tipografia e textos**: usar as classes existentes (`card-title`, `stat-card-value`, `stat-card-label`, `modal-title`, `form-label`) e o hook `useTranslation` com as chaves já cadastradas em `src/i18n`
- **Badges e inputs**: `badge badge-*`, `input`, `select`, `textarea`, `search-wrap`
- **Componentes**: reutilizar `ConfirmModal`, `EmptyState`, `ErrorMessage`, `Skeleton*`, modais com `modal-overlay`/`modal`/`modal-header`/`modal-body`/`modal-footer`
- **Cores e espaçamentos**: variáveis CSS (`var(--primary)`, `var(--border)`, `var(--text-muted)`, `var(--danger)`) — nunca hex hardcoded quando a variável existe
- **Fluxos**: exclusões usam `ConfirmModal`; listas com filtro usam pills `btn-sm btn-pill`; operações em massa seguem o padrão de seleção com checkbox (ver `Financial.tsx` como referência)

Se um novo padrão for inevitável, primeiro verificar `src/styles.css` e os componentes existentes; se realmente não existir, criar UMA vez em `styles.css`/componente compartilhado e usar dali em diante.

### 10. UX/UI — Estados da Interface
Toda interface nova deve considerar os estados necessários quando aplicável:

- **loading** — operação em andamento
- **skeleton** — placeholders visuais enquanto conteúdo carrega
- **empty state** — nenhum dado disponível, com mensagem amigável + CTA
- **error state** — erro claro com botão de retry
- **success state** — feedback visual de sucesso (toast, badge, animação)
- **disabled state** — elemento indisponível visualmente区别
- **hover** — feedback de interação ao passar o mouse
- **focus** — acessibilidade: outline visível para navegação por teclado
- **active** — estado pressionado/clicado
- **progress** — barra de progresso para operações longas
- **responsive states** — mobile, tablet, desktop

**Nunca deixe a interface vazia durante uma operação assíncrona.**

### 11. Skeleton
- Quando o conteúdo depender de dados assíncronos e o carregamento justificar, usar Skeleton
- O Skeleton deve representar aproximadamente a estrutura do conteúdo real — evite skeletons genéricos
- Usar o componente `SkeletonCard` do `src/components/Skeleton.tsx`
- Skeletons devem ter animação de pulso suave (não flash brusco)

### 13. Animações e Motion Design
- Transições suaves e intencionais quando apropriado: entrada/saída, modal/drawer, loading, progresso, expansão/colapso, troca de estados, feedback de interação
- Animações devem melhorar percepção, feedback, continuidade e compreensão — sem excesso
- Considerar `prefers-reduced-motion` quando aplicável
- Modais: fade in no overlay + slide up no conteúdo
- Toasts: slide in da direita, fade out após 3s
- Skeletons: animação de pulso contínuo
- Transições de página: fade suave (150-200ms)

### 3.2 Push Notifications (Web Push — canal-agnóstico)

**Arquitetura.** O serviço de push é INDEPENDENTE de canal — WhatsApp, Agenda, OS, Ligações, Asaas etc. consomem o MESMO contrato sem conhecer VAPID, criptografia ou subscriptions:

```
[Qualquer canal] --sendPush(PushPayload)--> supabase/functions/_shared/notify.ts
     --> edge function send-push-notification (service_role only)
     --> _shared/push.ts (RFC 8291 aes128gcm + JWT VAPID ES256, Web Crypto nativo do Deno)
     --> cada subscription em push_subscriptions
     --> public/sw.js (handlers push/notificationclick)
```

- **Contrato** (`supabase/functions/_shared/notify.ts`): `sendPush({ tenantId, title, body, kind?, conversationId?, url?, data? })` fire-and-forget. `kind` ∈ `message | appointment | os | billing | custom`.
- **Banner quando o painel recebe a mensagem (v1.0.115)**: push FCM só cobre o app 100% fechado. Com o painel vivo em background, o realtime (INSERT em `messages` → `useAttendance`) chama `notifyIncomingMessage()` (`src/lib/local-notify.ts`) = mesma notificação, sem servidor. Dedupe (push server × notificação local) via recibos em IndexedDB (`src/lib/push-receipts.ts` + implementação inline no `sw.js` — mesmos db/store/schema, manter em sincronia). O SW **suprime** o banner de `kind: message` quando existe janela visível (usuário já está vendo) e a página só notifica com `document.hidden`. Outbound (respostas da equipe) não notifica.
- **Novo canal só precisa importar `sendPush` e chamar com o payload** — nada de fetch manual, secrets ou crypto.
- **REGRAS DE PRODUTO**: push APENAS em celular com PWA INSTALADO (`isPushAvailable()` = mobile UA + standalone). Desktop e browser mobile não pedem permissão nem recebem badge. `lib/push.ts` centraliza isso — SEMPRE usar `isPushAvailable()`, nunca `isPushSupported()` direto na UI.
- **Ativação/desativação pelo usuário**: toggle "Notificações" no modal Sobre (⋮ no mobile) — `PushSetupRow`; ativa = `subscribePush` (grava flag `deeperia:push-enabled`), desativa = `disablePush` (unsubscribe local + delete no banco via `save-push-subscription` com `{ remove: true, endpoint }`). Permissão negada: instrução para liberar nas configurações.
- **Toggle = estado REAL, não máscara**: o switch da UI deriva de `isPushActive()` (permissão do navegador **concedida** + subscription ativa no service worker), nunca só da flag `deeperia:push-enabled`. Se o SO revogar a permissão, o toggle volta a desligado e avisa. `isPushEnabledByUser()` é apenas a *intenção* do usuário (usada pelo `PushPermissionGate`).
- **Rotação da chave VAPID**: `subscribePush` compara `subscription.options.applicationServerKey` com a chave atual; se different, faz `unsubscribe()` antes de assinar de novo (a subscription antiga nunca receberia push).
- **Chaves VAPID**: públicas via `.env` (`VITE_VAPID_PUBLIC_KEY`, injetada no bundle pelo `vite.config.ts/js` via `loadEnv` — fallback local) OU em runtime via edge function `push-config` (POST simples, o cliente chama quando a global de build está vazia — resolve produção hospedada sem env, ex.: Vercel sem `.env`). Privada server-side nos secrets do Supabase (`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). Para gerar: `npx web-push generate-vapid-keys` (rotação = regenerar + gravar no `.env` + `supabase secrets set` — SEM deploy extra no front).
- **Deploy**: `send-push-notification`, `save-push-subscription` e `push-config` com deploy normal; `uazapi-webhook` SEMPRE com `--no-verify-jwt` (regra acima).
- **ATENÇÃO — `supabase.functions.invoke()`**: recebe o **NOME** da função (`'push-config'`), nunca o path (`'/functions/v1/push-config'`). O path duplica o prefixo e a chamada volta **404 "Requested function was not found"**.
- **Tabela**: `push_subscriptions` (tabela `endpoint` unique, RLS por tenant) — migration `20261030120000_create_push_subscriptions.sql`. RLS corrigido em `20261102190000_fix_push_subscriptions_rls.sql` (claims do `user_metadata`, não top-level do JWT — ver `20260929150000_fix_users_rls.sql`).
- **ATENÇÃO — HKDF do payload (RFC 8291)**: em `_shared/push.ts` a ordem dos argumentos é `hkdf(ikm, salt, info, len)`. A RFC pede `CEK = HKDF(salt, IKM, cek_info, 16)` e `NONCE = HKDF(salt, IKM, nonce_info, 12)` — ou seja, a chamada é `hkdf(ikm, salt, ...)`. Inverter os dois deixa o tag AES-GCM inválido: o FCM aceita com **HTTP 201** (não valida o payload) e o **navegador descarta a notificação silenciosamente**. Teste de regressão em `src/lib/__tests__/push-crypto.test.ts` (decifra com uma implementação independente).
- **Badge do ícone do app**: `navigator.setAppBadge(n)`/`clearAppBadge()` via `src/lib/push.ts` + `usePushBadge` (montado no `TenantLayout`). **Contador compartilhado SW↔página (v1.0.116)**: o unread real que a página recalcula é gravado em IndexedDB (`deeperia-push` v2, store `badge` — `src/lib/badge-counter.ts` + implementação inline no `sw.js`, manter schema em sincronia); o SW lê esse valor a cada push com banner, soma +1 (cap 99) e chama `setAppBadge` com o app FECHADO. Página também reassenta no evento `deeperia:unread-changed` (disparado pelo realtime inbound no `useAttendance`) e no `visibilitychange → visible`. Casos de supressão/dedupe não incrementam.
- **Pedir permissão**: `PushPermissionGate` — modal único por instalação (localStorage), 2,5s após load, só quando `permission === 'default'` e apenas em PWA mobile.
- **Browser → PWA**: `OpenAppGate` (montado no App root) — o app standalone grava `deeperia:installed` (WebAPK compartilha storage com o Chrome no Android); aberto pelo browser em celular, faz UMA tentativa de navegar in-scope (Android abre o WebAPK via intent filters) e, se permanecer, mostra tela "Abrir pelo app instalado" com proposta de continuar no navegador. iOS não permite detectar o PWA instalado — sem redirect lá.
- **Teste ponta a ponta**: PWA instalado → login → permitir notificações → enviar mensagem de lead → deve aparecer preview na barra + contador no ícone. Sem device, smoke interno: POST em `send-push-notification` com Bearer service_role = `{"ok":true,"sent":N}`.

### 3. Code Quality and Observability

#### Observability
- **Error tracking**: Sentry or equivalent
- **Performance monitoring**: OpenTelemetry traces
- **Logging**: Structured logs with context (user, tenant, action)

#### Code Quality
- **Linting**: ESLint with strict rules, zero warnings on commit
- **Formatting**: Consistent code style (Prettier or Biome)
- **Type safety**: Strict TypeScript, no `any` types
- **Dead code**: Remove unused imports, variables, and functions (use Knip)
- **Contracts**: Validate API responses against schemas (Zod or equivalent)

#### Testing
- **Unit tests**: For repositories, stores, and utility functions
- **Integration tests**: For critical user flows
- **E2E tests**: Playwright for main user journeys (login, create OS, manage customers)
- **Coverage**: Target 80%+ on new code

### 4. Code Size Rule - MANDATORY

**Every component/function must stay under 200 lines.** If a file exceeds this:

1. **Extract** sub-components into separate files
2. **Split** large functions into smaller, focused functions
3. **Move** business logic to custom hooks or services
4. **Separate** concerns: UI vs logic vs data fetching

**Never leave giant files.** When adjusting code, always refactor to keep it clean and maintainable for future changes.

Rules:
- Max 200 lines per file
- Max 50 lines per function
- Max 3 levels of nesting
- Max 3 props per component (use config objects for more)
- If a component has 10+ props, split it

### 5. File Organization

```
src/
  components/        -> Shared/reusable components
  pages/             -> Route-level page components
  stores/            -> Zustand stores (global state)
  repositories/      -> Data access layer (Supabase)
  types/             -> TypeScript interfaces
  lib/               -> Utilities, Supabase client, helpers
  hooks/             -> Custom React hooks
  superadmin/        -> SuperAdmin panel pages
  i18n/              -> Translations
```

### 6. Environment Variables

```bash
# .env
VITE_SUPABASE_URL=https://sknimzjwpdbcuutxbycq.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 7. Versionamento — OBRIGATÓRIO

A versão do app fica em `package.json` e é injetada no bundle pelo Vite
(`define.__APP_VERSION__`), exposta em `src/lib/version.ts`
(`APP_VERSION` e `APP_VERSION_LABEL`).

**Todo commit que altere o sistema DEVE subir a versão de patch antes do commit:**

```bash
npm run version:bump   # 1.0.100 -> 1.0.101
```

Regras:
- Nunca commitar mudança de código sem o bump de versão
- A mensagem do commit termina com a versão: `fix: ... (v1.0.101)`
- A versão atual aparece na sidebar (desktop, ao lado do usuário) e em **⋮ → Sobre** (mobile)
- Mudanças incompatíveis sobem minor/major manualmente: `npm version minor --no-git-tag-version`
- A versão inicial do sistema é **1.0.100**

---

## Quick Reference

### Start Development
```bash
cd C:\Users\Jovani\Projeto_ConsertIA\ConsertIA
npm run dev
```

### Push DB Migration
```bash
supabase db push --linked
```

### Type Check
```bash
npx tsc --noEmit
```

### Build
```bash
npm run build
```

### Bump de versão (obrigatório antes de cada commit)
```bash
npm run version:bump
```

### Deploy Uazapi Webhook (Edge Function)
```bash
supabase functions deploy uazapi-webhook --no-verify-jwt
```

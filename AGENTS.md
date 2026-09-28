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

### Deploy Uazapi Webhook (Edge Function)
```bash
supabase functions deploy uazapi-webhook --no-verify-jwt
```

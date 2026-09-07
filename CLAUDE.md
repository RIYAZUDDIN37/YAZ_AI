# CLAUDE.md

Guidance for anyone (human or AI) picking up work on YAZ AI.

## Project overview

YAZ AI is a multi-tenant SaaS platform: businesses configure AI employees
that understand their business (via uploaded knowledge), take real
actions through a permissioned tool registry, talk to customers, and
escalate to a human when a decision is outside what they're allowed to
make. Full product vision: [`docs/PRODUCT.md`](docs/PRODUCT.md).

This is being built in the 20 phases defined in the original spec,
validating (typecheck → lint → build, and where a database is involved,
an actual live-verified run — not just typechecked) before moving on
from each. This file's **Implementation status** section below is the
authoritative record of where that stands — trust it over any assumption
from the repo structure alone.

**Build order decision**: rather than building all five industries and
every phase's UI breadth-first, we're going **core-first** — one
industry (Urban Living, furniture) built genuinely deep, including a
real working AI orchestration engine with actual tool calls, before
widening to the other four industries and the remaining UI surface
(automations, payments, analytics). A narrow, real, working core beats
broad scaffolding for a portfolio piece. Concretely this means Phase 6
(conversations) and Phase 7–8 (AI orchestration + tools) come before the
full Phase 4–5 CRUD UI breadth and before Phase 15 (the other four
industries' configuration).

## Architecture at a glance

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full
reasoning. In short: modular monolith, `app/` holds routes only,
`services/` holds business logic and is the only layer that talks to
Prisma for anything non-trivial, `server/` holds request-lifecycle
concerns (auth, authorization, the db client), `lib/` holds cross-cutting
utilities, `config/` holds data-driven configuration (e.g. the five
industries).

**Three non-obvious things that will trip you up if you don't know them:**

1. shadcn/ui here is built on **Base UI**, not Radix. Polymorphism is a
   `render` prop (`<Button render={<Link .../>} />`), not `asChild`.
2. Server actions in this codebase take **typed objects**, not
   `FormData` — RHF validates client-side, then calls the action
   directly with the validated value.
3. Base UI's `<Select.Value>` does **not** auto-resolve a label from the
   selected value the way Radix's does — it renders the raw value
   unless you pass it a `children` render function
   (`<SelectValue>{(value) => lookup(value)}</SelectValue>`). Found this
   the hard way in the Inbox's "new conversation" dialog, where it was
   showing a raw customer cuid instead of the customer's name.
4. **`react-hook-form`'s `defaultValues` are read once, at mount.** A
   form component that receives an id-like prop (e.g. `conversationId`)
   and isn't remounted when that prop changes will keep submitting
   against the *original* id forever. Give it `key={theChangingId}` at
   the call site to force a remount. Found this in the Inbox message
   composer: switching conversations without a page reload kept sending
   replies to whichever conversation the composer first mounted with —
   a real bug caught during live verification, not a hypothetical.

## Commands

```bash
npm run dev            # dev server
npm run build           # production build
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run test              # Vitest
npm run db:push           # sync schema.prisma to the database
npm run db:studio         # Prisma Studio
docker compose up -d      # Postgres + Redis for local dev
```

## Coding conventions

- Business logic goes in `src/services/**`, never inline in a route,
  page, or component. Pages/actions call services.
- Every server action: validate with the matching Zod schema from
  `src/lib/validation/*`, call a service, catch with
  `toActionError()` (`src/lib/handle-error.ts`) → return `{ error }` to
  the client. Throw `AppError` (or `ForbiddenError`/`NotFoundError`) from
  services for anything the user should see the real message for.
- Never trust a tenant ID (`organizationId`/`businessId`) from the client
  as authorization by itself — re-check the caller's actual membership
  server-side. See `src/services/onboarding/complete-onboarding.ts` for
  the pattern, and `docs/SECURITY.md`.
- Role checks go through `can(role, permission)`
  (`src/server/authorization/permissions.ts`) — never
  `role === "OWNER"` inline.
- New forms: build the Zod schema in `src/lib/validation/`, use RHF +
  `zodResolver`, and reuse/extend `src/components/form/text-field.tsx`
  rather than hand-rolling `Field`/`FieldLabel`/`FieldError` each time.
- Don't add a shadcn component by hand — `npx shadcn@latest add <name>`
  (see gotcha below if `add form` looks like it does nothing).
- No fake states: every non-trivial page needs real loading/empty/error
  handling once it has real data to be empty or fail on. Don't add a
  nav link to a page that doesn't exist yet.

## Environment

Copy `.env.example` to `.env`. Everything is read through
`src/lib/env.ts` (Zod-validated at startup) — don't read `process.env`
directly elsewhere. `docker-compose.yml` provisions local Postgres+Redis
matching the example file's defaults.

## Implementation status

### Done (Phase 0–1)

- Repo scaffolded: Next.js 15 (App Router, `src/` dir, TS strict),
  Tailwind v4, shadcn/ui (Base UI), ESLint, Prettier, Vitest configured.
- Design tokens customized (warm neutral base + a copper/amber `--brand`
  accent — deliberately not the generic AI purple/blue) in
  `src/app/globals.css`.
- Environment validation (`src/lib/env.ts`), `.env.example`,
  `docker-compose.yml` (Postgres 16 + Redis 7).
- Prisma schema: `User`, `Organization`, `OrganizationMember` (role),
  `Business` (industry enum), `AIAgent` (minimal stub), `AuditLog`. See
  `docs/DATABASE.md`.
- Auth: Auth.js v5, Credentials provider, JWT sessions, split
  edge/Node config so `middleware.ts` stays Edge-safe. Route protection
  on `/dashboard/*` and `/onboarding/*`.
- Centralized authorization (`can(role, permission)`).
- Real, persisted flows: **sign-up** (creates User + Organization +
  OrganizationMember, transactional) → **onboarding** (3-step wizard:
  business name → industry → AI employee name/title; creates Business +
  first AIAgent, transactional, re-authorized server-side) →
  **dashboard** (shows the real created business + agent; no
  fabricated data). Every step writes to `AuditLog`.
- Landing page (spec section 28's sections), sign-in/sign-up screens.
- `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/AI-ARCHITECTURE.md`
  (design-only — nothing in it is implemented yet), `docs/SECURITY.md`,
  `docs/PRODUCT.md`.

### Done (Phase 3)

- Prisma schema extended: `ProductCategory`, `Product`, `ProductVariant`,
  `InventoryItem`, `ServiceCategory`, `Service`, `Customer`,
  `CustomerNote`, `CustomerTag`, `Lead`, `LeadActivity`. Still on
  `db:push` (no migration history yet) — switching to `db:migrate` once
  the schema settles down more; see `docs/DATABASE.md`.
- `prisma/seed.ts`: idempotent (safe to re-run) seed for Urban Living —
  11 products across 4 categories (some with color/finish variants +
  real per-SKU inventory), 5 customers, 5 leads spread across every
  `LeadStatus`. Also creates the demo owner account
  (`owner@urbanliving.test` / `UrbanLiving123!`) so evaluators can sign
  in directly instead of onboarding from scratch. Deliberately does
  **not** seed any AI-activity-shaped data (no `LeadActivity` rows
  pretending to be AI qualification signals) — that only gets seeded, if
  ever, once Phase 7+'s orchestration engine can actually produce it for
  real, per the project's own "never fabricate AI activity" rule.
- Dashboard Overview now shows real counts (Leads, Products, Customers)
  queried live — no more hardcoded zeros for the data that now exists.

### Done (Phase 6)

- Prisma schema: `Conversation`, `Message`, plus `ConversationStatus`
  and `MessageSenderType` enums (the latter includes `AI` for
  forward-compatibility — nothing writes it yet; see `docs/DATABASE.md`).
- New `conversations:manage` permission, granted to all four roles
  including STAFF (spec section 6: staff get conversation access, not
  business-wide settings).
- Real Inbox at `/dashboard/inbox` — three-pane layout (conversation
  list, thread, context panel), Intercom-style per spec section 17:
  - "Log a conversation" — a staff member recording real customer
    contact (a call/email/walk-in) as a new conversation; picks an
    existing customer, enters what they said.
  - Persisted, real-time-feeling replies (server action + revalidation,
    no fake optimistic UI).
  - Take over / Return to AI / Mark resolved / Reopen — the full spec
    section 11 state machine (superseded by Phase 7-8's real "Return to
    AI" below — this line kept for history).
  - Context panel shows the conversation's real customer info and any
    linked leads (cross-referencing Phase 3's CRM data) — an "AI
    Activity" section honestly states none exists yet rather than
    showing anything fabricated.
- Dashboard nav is no longer a single item — added Overview + Inbox,
  both real, active-state aware (`src/components/dashboard/nav-link.tsx`).
- `prisma/seed.ts` extended: 3 realistic conversations for Urban Living
  (multi-message threads, one resolved) — plain CRM events, not
  AI-attributed.
- Overview's "Conversations" stat now wired to a real count too.

### Done (Phase 7–8) — the AI orchestration engine

This is the phase that makes YAZ AI more than a well-built CRM. Full
design/status writeup: `docs/AI-ARCHITECTURE.md` — summary here:

- `AIProvider` abstraction (`src/services/ai/provider.ts`), two
  implementations: `mock` (default — deterministic keyword matching, but
  every tool call it makes is 100% real) and `anthropic` (a manual
  tool-calling loop against Claude, implemented and typechecked but not
  yet live-verified — no API key on this machine).
- `ToolRegistry` with 4 real tools (`src/services/ai/tools/`):
  `searchProducts`, `checkInventory`, `createLead`, `escalateToHuman` —
  each Zod-validated, logged, and touching the real database.
- `AgentExecution` / `AgentAction` models — one row per agentic turn / per
  tool call, feeding the Inbox's "AI activity" panel with real data.
- The full spec-section-11 conversation lifecycle, all real: new
  conversations start `AI_HANDLING`; a follow-up customer message
  re-triggers the AI if still `AI_HANDLING`; a staff reply is an
  implicit takeover (`HUMAN_HANDLING`); "Return to AI" re-engages the AI
  immediately if a customer message is waiting unanswered.
- Escalation (`escalateToHuman`) is the real governance backbone today —
  see AI-ARCHITECTURE.md's "Governance today vs. the design goal" for
  exactly what's enforced-in-code vs. still prompt-based.
- `.env`/`.env.example`/`src/lib/env.ts`: `AI_PROVIDER` narrowed to
  `"mock" | "anthropic"` (no OpenAI — deliberately not built),
  `AI_CHAT_MODEL` defaults to `claude-opus-5`, `OPENAI_API_KEY` removed.

### Verification status

`npm run typecheck`, `npm run lint`, and `npm run build` all pass clean.

**Live-verified against real Postgres** (2026-09-07): started
`docker compose up -d`, ran `npm run db:push`, then drove sign-up →
onboarding (Furniture, "Urban Living") → dashboard through an actual
browser session, and independently confirmed the rows via `psql` —
`users`, `organizations`, `businesses` (industry `FURNITURE`,
`onboardedAt` set), `ai_agents` (Maya, ONLINE), and both `audit_logs`
rows (`user.registered` → `business.onboarded`) with correct foreign
keys. Not merely typechecked — actually run.

**Phase 6 live-verified** (2026-09-07): signed in as the seeded demo
owner, opened Inbox, confirmed all 3 seeded conversations render with
correct message attribution/timestamps/lead cross-referencing; sent a
live reply (persisted, correctly attributed, list preview updated);
toggled Mark resolved / Reopen (persisted); used "Log a conversation" to
create a brand-new conversation for a different customer end-to-end,
confirmed it correctly pulled that customer's existing lead into the
context panel. Found and fixed the Base UI `Select.Value` bug (above)
during this pass — the customer picker was showing raw cuids until
fixed.

**Phase 7-8 live-verified** (2026-09-07), mock provider, real browser
session as the seeded owner:
- Logged a new conversation ("coffee table... budget under 15000") for a
  customer with no prior conversation — Maya called `searchProducts` →
  `checkInventory` → `createLead` for real (verified via `psql`: exact
  matching `AgentAction` input/output rows, a genuine new `Lead`, and the
  reply persisted as a `Message` with `senderType: AI`), then replied
  correctly summarizing real stock and price data.
- Sent an escalation-triggering message ("...speak to a manager") on the
  same conversation — Maya called `escalateToHuman` for real, flipping
  the conversation to `HUMAN_NEEDED` (confirmed via `psql`), replied
  appropriately, and the Inbox showed the "Needs you" badge.
- Took over (→ `HUMAN_HANDLING`), returned to AI (→ `AI_HANDLING`, no
  spurious re-run since the last message was already answered), then
  logged one more customer message ("tv unit under 25000") — Maya picked
  it back up automatically and found the real `Cornerstone TV Unit`.
- Found and fixed the `react-hook-form` stale-mount bug (gotcha #4,
  above) mid-verification: a reply briefly landed on the wrong
  conversation before the `key` fix; re-verified clean afterward.

`npm run test` (Vitest) is still blocked on this machine: Node 20.8.0 is
below the 20.12 the Vite/Vitest toolchain requires (`node:util`'s
`styleText`). Everything else (`dev`, `build`, `lint`, `db:push`) works
fine on 20.8.0 — only the test runner needs the Node upgrade.

**Project location**: moved from a OneDrive-synced folder to
`D:\Projects\YAZ AI` — OneDrive's background sync intermittently
corrupted the `.next` build cache mid-dev-session (random `ENOENT`/
`EINVAL` errors on files webpack was actively writing), which is a
structural conflict with any cloud-synced folder, not a one-off bug.
Don't develop this project from inside a Dropbox/OneDrive/Google Drive
folder.

**Bug found and fixed during this move**: resetting the dev database
while a browser held an old session cookie caused an infinite redirect
loop on `/onboarding` — `requireMembership()`
(`src/server/authorization/require-session.ts`) assumed "signed in but
no membership" could never happen and redirected back to `/onboarding`
itself. Fixed to redirect to `/sign-in` instead, since a membership-less
session is actually an orphaned/stale one (references a `userId` that no
longer exists), not a "hasn't onboarded yet" user — every real user gets
a membership transactionally at registration. This is a real
defensive-coding gap, not an artifact of the environment move — worth
remembering if a similar "assumed can't happen" fallback shows up
elsewhere.

### Known limitations

- **Node version**: this machine runs Node 20.8.0. `prisma@7` and a few
  other packages want ≥20.9/20.19; `prisma`/`@prisma/client` are pinned
  to `6.19.3` to stay compatible. **Recommend upgrading Node** and
  revisiting those pins.
- **The Anthropic provider is unverified against the real API** — no
  `ANTHROPIC_API_KEY` on this machine. It's implemented and typechecked
  against the real SDK types, and the mock provider (default) proves the
  rest of the pipeline works, but genuine LLM-driven tool calling hasn't
  been run. Add a key to `.env` and set `AI_PROVIDER="anthropic"` to try it.
- **No knowledge/RAG, no business-configurable `AgentRule`** — Phase
  9-10. Today's one governance rule (escalate instead of guessing) is
  hardcoded into the orchestrator's system prompt, not per-business
  configurable yet. See `docs/AI-ARCHITECTURE.md`.
- **No OpenAI adapter** — deliberately not built; `AI_PROVIDER` only
  accepts `"mock"` or `"anthropic"`.
- No OAuth providers wired (Credentials only) — see ARCHITECTURE.md for
  why the Prisma adapter isn't set up yet.
- No rate limiting, no file upload validation yet (nothing to validate —
  no uploads exist). See `docs/SECURITY.md` → Known gaps.
- Dashboard nav has two real items (Overview, Inbox) — still no
  Customers/Leads/Products links, because those dedicated pages don't
  exist yet (Phase 4-5). Adding the links before the pages would be
  dead navigation, which the spec explicitly forbids.

## Next steps (core-first order — see "Build order decision" above)

1. **Phase 9–10** — knowledge/RAG pipeline (`KnowledgeDocument`/
   `KnowledgeChunk`, upload → chunk → embed → retrieve, scoped to
   businessId) and business-configurable governance (`AgentRule`,
   `AgentPersonality`, `AgentGoal` — makes today's hardcoded escalation
   rule a real per-business setting); Train/Test AI employee UI (the
   simulator must call the exact same `runAgentTurn` real conversations
   use, per spec section 14 — no separate fake implementation).
2. **Phase 4–5** — full owner workspace nav + customers/leads/
   appointments/products CRUD UI (the schema and dashboard stat counts
   already exist from Phase 3; this is the dedicated list/detail/edit
   pages).
3. **Phase 15** — extend to the other four industries (Restaurant,
   Salon, Dental, Electronics): seed data + any industry-specific tool
   behavior (e.g. Dental's never-diagnose guardrail, once AgentRule
   exists to enforce it as data rather than another hardcoded prompt line).
4. Then automations (13), commerce — quotations/orders/payments (14),
   the customer-facing widget (16), analytics (17), and hardening/
   testing/polish (18–20), per the original phase list. Update this file
   after each phase, not just at the end.

**Also worth doing soon, not tied to a specific phase**: get a real
`ANTHROPIC_API_KEY` into `.env` and live-verify the `anthropic` provider
— the mock proves the pipeline, but genuine LLM tool-calling is the more
convincing demo.

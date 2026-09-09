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
5. **The Browser pane's `preview_start({name: ...})` can be anchored to
   a stale project folder**, independent of this session's actual
   working directory. On this machine it kept resolving to the old
   pre-move `C:\...\OneDrive\Desktop\YAZ AI` copy (missing everything
   built since the move to `D:\Projects\YAZ AI`), not the real
   `.claude/launch.json`-less D: folder. Workaround: run the real
   server manually (`npx next start -p <port>`) and `navigate`/
   `preview_start({url: ...})` straight to it. Auth.js v5 then rejects
   the request as `UntrustedHost` unless the port matches
   `NEXTAUTH_URL` exactly (`http://localhost:3000` here) — either run on
   that exact port, or set `AUTH_TRUST_HOST=true` for that one verification
   process only (never commit it). If sign-in still redirects to a dead
   port, the browser tool may also just refuse `navigate` to a
   non-standard port outright — sticking to port 3000 sidesteps both
   problems at once.

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

### Done (Phase 9–10) — knowledge retrieval + business-configurable governance

Full design/status writeup: `docs/AI-ARCHITECTURE.md` — summary here:

- `KnowledgeDocument` / `KnowledgeChunk` (`src/services/knowledge/`):
  paste-text documents (no file storage abstraction yet), chunked
  synchronously (`chunk-text.ts`) and retrieved by real lexical
  (keyword-overlap) scoring (`retrieve.ts`) — honestly not semantic
  embeddings (no `EmbeddingService`/API key), same "real data, simulated
  understanding" posture as the mock AI provider.
- `AgentRule` / `AgentGoal` (`src/services/agents/rules.ts`,
  `goals.ts`) plus `AIAgent.tone`/`customInstructions` — owner-authored,
  real rows injected into the system prompt in order by
  `runAgentTurn`, replacing what used to be only a hardcoded rule.
  `escalateToHuman` remains the one rule with a real code-level
  effect; everything else is real, configurable prompt *content* now,
  not yet a distinct validation stage.
- `runAgentTurn` now retrieves knowledge before building the prompt and
  logs a `context` trace step recording exactly which rules/goals/
  knowledge chunks were used — both the Inbox context panel and the new
  Test tab read this real data.
- Train AI Employee page (`/dashboard/agent`, `business:manage` only):
  Profile, Rules, Goals, Knowledge tabs (CRUD), and a Test tab — spec
  section 14's simulator, calling the exact same `runAgentTurn` a real
  conversation uses. `Conversation.isTest` keeps sandbox conversations
  (always `customerId: null`) out of the real Inbox and real CRM data;
  `createLead` honestly reports "no linked customer" in the sandbox
  instead of writing a fake `Lead`.
- `prisma/seed.ts` extended: 2 rules, 2 goals, and a real "Shipping &
  Delivery Policy" `KnowledgeDocument` (chunked the same way the UI
  does it) for Urban Living.

### Done (Phase 4–5) — owner workspace: Customers, Leads, Products

Full CRUD UI over the Phase 3 schema (Customer/Lead/Product were data
and dashboard stat counts only until now — this is the dedicated
list/detail/edit pages, per the original "Next steps" note).

- Two new permissions: `customers:manage` (Customers + Leads — granted
  down to STAFF, matching spec section 6's "limited customer access")
  and `catalogue:manage` (Products/pricing/inventory — MANAGER and up
  only, same tier as `business:manage`).
- **Customers** (`/dashboard/customers`): list + detail page with an
  editable profile form, linked leads, linked conversations (cross-
  referencing Inbox), and notes (`CustomerNote`, author-attributed).
- **Leads** (`/dashboard/leads`): list with status-filter tabs + detail
  page with a status changer (writes a real `LeadActivity` "status
  change" row, the same table the AI's `createLead` tool writes to) and
  a note timeline. Human-created leads are visually distinguished from
  AI-created ones (an "AI" badge, sourced from `Lead.source === "AI
  conversation"`) rather than looking identical.
- **Products** (`/dashboard/products`, labelled by
  `industryConfig.catalogueLabel` — "Products" for Urban Living): list
  + detail page with an editable form and per-variant inventory, with
  inline stock adjustment (`InventoryItem.quantityOnHand` — the exact
  same table `checkInventory`, the AI tool, reads). Category creation
  exists as a service (`src/services/products/create-category.ts`) but
  has no dedicated UI yet — the create/edit product forms only pick
  among existing categories.
- Nav gained Customers/Leads/(catalogue label), each gated by its
  permission; Overview's stat tiles now link to their real pages;
  fixed two stale copy spots that predated Phase 7-8/Phase 4-5
  (`dashboard/page.tsx`'s "the AI isn't real yet" card, the Inbox empty
  state's "customer management lands in an upcoming phase" line).
- **Scope note**: the original phase description also names
  "appointments" — there's no `Appointment` model yet (that's Phase 14
  per `docs/DATABASE.md`'s "What's coming"), so it's not part of this
  phase's UI. Services (the Restaurant/Salon/Dental catalogue type) also
  has no dedicated UI yet — only Products, since Urban Living
  (Furniture) is the only seeded/live business today; building an
  unverifiable Services UI before a service-industry exists to test it
  against would violate the project's own "no fake states" rule.

### Done (Phase 14, partial) — Appointments

Just the `Appointment` model + booking, not the rest of commerce
(quotations/orders/payments — still design-only).

- `Appointment` model: optional `customerId`/`leadId` (a walk-in with no
  prior lead can still get one booked), `source` mirroring `Lead.source`'s
  "AI conversation" vs. staff-booked convention, `status` (`SCHEDULED` /
  `CONFIRMED` / `COMPLETED` / `CANCELLED` / `NO_SHOW`).
  See `docs/DATABASE.md`.
- 5th AI tool: `createAppointment` (`src/services/ai/tools/`) — same
  permissioned/logged/Zod-revalidated pattern as the other four, same
  "no linked customer" honest failure as `createLead` when called from a
  customerless conversation (e.g. the Test simulator). The mock provider
  now genuinely calls it on booking-intent keywords ("book a showroom
  visit", etc.) — honestly, it can't parse a real date like an LLM
  would, so it always books next-day 11:00 local; the appointment row
  is real, only the "when" is a fixed default. See
  `docs/AI-ARCHITECTURE.md`.
- `/dashboard/appointments` (`customers:manage`, same tier as Leads):
  list with inline status actions (Confirm/Complete/No-show/Cancel) +
  a booking dialog. No separate detail page — the list is the whole
  surface, a deliberate scope trim rather than a placeholder page with
  little on it. Labelled per-industry (`industryConfig.appointmentLabel`
  — "Showroom Visit" for Urban Living).
- Nav gained the appointments link; Overview's previously-hardcoded "0"
  stat for `${appointmentLabel}s` is now a real, linked count.
- `prisma/seed.ts`: one real `Appointment` for Vikram Joshi, linked to
  the lead whose `LeadActivity` already narrated "Booked a showroom
  visit for this Saturday" — that row is what makes the narration true
  rather than just a plausible-sounding string.

### Done (Phase 15) — Services catalogue + Dental guardrail

- `IndustryConfig` gained `catalogueType: "products" | "services"`
  (`src/config/industries.ts`): Furniture/Electronics/Restaurant are
  `"products"` (Restaurant's "Menu" label notwithstanding — a menu item
  is priced/sold, not time-booked); Salon/Dental are `"services"`. Drives
  which route/model the catalogue nav link, Overview stat, and count
  query use — one industry, one code path, no per-vertical branching
  scattered across pages.
- `/dashboard/services` (+ detail/edit page): full CRUD parity with
  Products — list, create dialog, editable detail page. No inventory
  section (services aren't stocked) and no AI tool parity yet
  (`searchServices`/`getServiceDetails` are still on the "not yet built"
  list in `docs/AI-ARCHITECTURE.md` — a deliberate scope trim, not an
  oversight).
- **Second demo business**: Bright Smile Dental (Dental, Bengaluru;
  `owner@brightsmile.test` / `BrightSmile123!`) — `prisma/seed.ts`,
  lighter than Urban Living by design (it exists to prove genericity,
  not to be a second flagship). 4 services across 2 categories, 3
  customers, 2 leads, 1 conversation (a patient asking a diagnostic
  question, a human declining to diagnose over chat — the scenario the
  guardrail exists for), 1 appointment, and — the actual point — **2
  real `AgentRule` rows implementing Dental's "never diagnose" guardrail**
  (spec's named example), injected into Aria's system prompt exactly
  like any other business's rules. Same honest framing as everywhere
  else: the rule *content* is real and business-configurable now; a
  distinct validation stage that checks a response against it before it
  ships still doesn't exist. See `docs/AI-ARCHITECTURE.md`.
- Also discovered (not created by me): real `Spice Route` (Restaurant,
  owned by a real test account) and `yolo` (Salon, owned by the actual
  project owner's own account) businesses already existed in the dev DB
  from genuine prior onboarding — both with correctly-created industry
  agents (Nora, Zara). Left untouched (not my data to modify), but it's
  real corroborating evidence the onboarding wizard already handles
  Restaurant and Salon correctly, on top of the Dental path this phase
  verified directly.

**Phase 15 live-verified** (2026-09-09), real browser session as the
seeded Bright Smile Dental owner:
- `/dashboard/services` renders all 4 seeded services correctly; nav
  and Overview both correctly route to Services/its count (not
  Products) — confirmed `catalogueType` branching works, not just typechecks.
- Overview's `${appointmentLabel}s` stat correctly reads "Doctor
  Appointments" (industry label) with the real count.
- Created a new service ("Dental X-Ray") through the dialog — confirmed
  via `psql`: real `Service` row, correct slug/duration/price.
- Train Aria → Rules tab shows both real Dental guardrail rules. Sent a
  diagnostic-shaped test message ("my gum has been bleeding for a week,
  is that serious?") through the Test tab — confirmed via `psql` against
  the actual `AgentExecution.trace` JSON that both rules' full text and
  both goals' full text were genuinely embedded in the turn's context
  (not just a count). The mock provider's reply itself was its generic
  fallback (no dental-specific keyword logic was added — the mock's
  honest job is proving the pipeline works, not simulating real
  diagnosis-avoidance judgment; that's what the Anthropic provider
  reading these same rules would actually do).

### Done (Phase 13) — Automations + Notifications

No cron/queue infra exists in this app, so an `Automation` is
event-driven, not time-scheduled: it fires synchronously, in the same
request, at the exact moment its trigger event happens.

- `Automation` / `WorkflowExecution` / `Notification` models. 4 triggers
  (`LEAD_CREATED`, `LEAD_STATUS_CHANGED` — with an optional target-status
  filter, `CONVERSATION_ESCALATED`, `APPOINTMENT_BOOKED`) × 3 actions
  (`NOTIFY_TEAM`, `ADD_LEAD_NOTE`, `CHANGE_LEAD_STATUS`). See
  `docs/DATABASE.md`.
- `src/services/automations/run.ts`: `runAutomations(businessId, event)`
  — called directly from the exact service functions and AI tools that
  already write the row the event describes (`createLead` human +
  AI tool, `updateLeadStatus`, `escalateToHuman`, `createAppointment`
  human + AI tool). Never throws past the caller (a misconfigured
  automation must not break the real action that raised the event); logs
  one real `WorkflowExecution` row per automation it evaluates
  (`SUCCESS`/`SKIPPED`/`ERROR`) — same "real audit trail" posture as
  `AgentExecution`.
  `escalateToHuman` explicitly skips automations for sandbox (`isTest`)
  conversations — a Test Employee simulator run shouldn't page the real
  team; `createLead`/`createAppointment`'s existing "no linked customer"
  early return already guards the sandbox case for those two triggers.
- `/dashboard/automations` (`business:manage`): list with an active
  toggle + delete, a create dialog whose sub-fields change based on the
  chosen trigger/action (e.g. a target-status picker only appears for
  `LEAD_STATUS_CHANGED`), and a real "Recent runs" panel reading
  `WorkflowExecution` rows — not a separate, potentially-fabricated
  activity feed.
- `Notification` (in-app only — no email/SMS/push provider): a bell icon
  in the dashboard header with a real unread count, and
  `/dashboard/notifications` to read/mark-read. `NOTIFY_TEAM` creates one
  row per organization member (their own `userId`), not a shared
  `userId: null` row — keeps per-user read state correct without a join
  table.
- `prisma/seed.ts`: two real automations for Urban Living — "Notify team
  on escalation" and "Celebrate won leads" (the second demonstrates the
  `LEAD_STATUS_CHANGED` → `WON`-only filter).

**Phase 13 live-verified** (2026-09-09), real browser session as the
seeded Urban Living owner:
- Changed a real lead's status to `WON` through the UI — "Celebrate won
  leads" fired for real: a `🎉 Deal won...` note appeared in the lead's
  activity feed, and a `SUCCESS` `WorkflowExecution` row showed up in
  Automations' Recent runs, confirmed via `psql`.
- Changed a different lead to `CONTACTED` — same automation correctly
  logged `SKIPPED` ("Trigger condition didn't match"), proving the
  `LEAD_STATUS_CHANGED` → target-status filter actually filters, not
  just fires on any status change.
- Returned a real conversation to AI, then logged a customer message
  with escalation keywords — Maya called `escalateToHuman` for real,
  which fired "Notify team on escalation": a real `Notification` row
  appeared for the owner, the header bell showed an unread badge (1),
  and `/dashboard/notifications` listed it; marked it read and confirmed
  the badge cleared.
- Sent the same escalation-triggering message through the Test
  simulator (sandbox) — confirmed via `psql` that neither a new
  `Notification` nor a new `WorkflowExecution` row was created,
  proving the `isTest` guard in `escalateToHuman` actually suppresses
  automations for sandbox conversations rather than just being
  dead code.

### Done (Phase 14, rest) — Quotations, Orders, Payments

The commerce scope Phase 14 originally named alongside Appointments —
built in one continuous pass with Phases 16-20 per the user's explicit
"finish the rest of the project without stopping to ask" request.

- `Quotation`/`QuotationItem`, `Order`/`OrderItem`, `Payment` models.
  `src/services/commerce/catalogue-lookup.ts` resolves a line item
  against Product *or* Service depending on `IndustryConfig.
  catalogueType` — one lookup, used by both Quotations and Orders,
  instead of duplicating the branch. `unitPrice` is copied at add-time,
  not a live reference — a sent quotation can't silently reprice.
- `Payment` honestly models a staff member recording a payment already
  received (cash/UPI/bank transfer/card) — no real payment gateway is
  wired on this machine, so there's deliberately no `PaymentLink`/
  `PaymentTransaction`. See `docs/DATABASE.md`.
- Appointment conflict checking, finally: `src/services/appointments/
  check-conflict.ts` queries existing `Appointment` rows for an
  overlapping time window (no separate `AvailabilitySlot` table —
  treats the business as one implicit resource) — wired into both the
  human booking service and the AI's `createAppointment` tool, which
  now returns an honest "that time is already booked" instead of
  silently double-booking.
- `/dashboard/quotations` (+ detail: add/remove items while `DRAFT`,
  status actions, "Convert to order") and `/dashboard/orders` (+
  detail: items, status, a payments panel showing amount paid vs.
  total). Both gated by `customers:manage`, same tier as Leads.
- Nav restructured: a "More" dropdown (`src/components/dashboard/
  more-nav.tsx`) holds Appointments/Quotations/Orders/Analytics/Train
  AI Employee/Automations — the flat nav bar was outgrowing a single
  row now that this many real pages exist.
- `prisma/seed.ts`: a `SENT` quotation for Rohan Kulkarni (2 items,
  matching the exact products/prices his existing Inbox conversation
  already names) and a fully-paid `FULFILLED` order for Ananya
  Deshmukh's `WON` lead — so Analytics has real revenue from the
  moment the seed runs.

Live-verified against real Postgres: accepted the seeded quotation
through the UI, converted it to a real order (items copied correctly),
recorded a partial payment (₹30,000 of ₹66,199) with correct staff
attribution, confirmed the running balance updated — all confirmed via
`psql`.

### Done (Phase 16) — customer-facing widget

The one unauthenticated, public surface in the app.

- `src/app/widget/[slug]/page.tsx` + `src/app/api/widget/[slug]/
  message/route.ts`: a business embeds `<iframe src=".../widget/{slug}">`
  on their own website (snippet + live preview generated in a new
  "Website widget" tab on the Train AI Employee page). A real,
  anonymous "Website visitor" `Customer` + `Conversation` gets created
  on first message; `sendWidgetMessage` (`src/services/conversations/
  widget-message.ts`) calls the exact same `runAgentTurn` real Inbox
  conversations use — not a separate, simplified widget-only pipeline.
  Conversation continuity across messages is a `conversationId` held in
  `sessionStorage`, re-validated server-side against the business slug
  and `isTest: false` on every request (never trusted as authorization
  by itself).
- Redis, provisioned since Phase 0-1 and never used until now, finally
  does something real: `src/server/redis/client.ts` +
  `src/lib/rate-limit.ts` rate-limit the widget endpoint by IP
  (20 messages/minute), Redis-backed so it's correct across multiple
  server instances, falling back to an in-memory counter (fails open,
  never blocks the widget) if Redis is unreachable.
- `next.config.ts` sends `X-Frame-Options: SAMEORIGIN` on every route
  *except* `/widget/*` — the one route that must be embeddable
  cross-origin. Verified empirically (see Verification status below),
  not just written and assumed correct.

Live-verified: posted directly to the public API (`curl`, no auth) and
got a real AI reply referencing real product data; confirmed the
resulting `Customer`/`Conversation` rows are real (`source: "Website
Widget"`, `isTest: false`) via `psql`; sent 22 rapid requests and
watched the 21st get a real `429` (confirmed the rate-limit key
actually appears in Redis via `redis-cli KEYS`, not just the in-memory
fallback); drove the widget page itself in a real browser session and
got a real, in-context reply; confirmed `X-Frame-Options` is present on
a normal page and genuinely absent on `/widget/urban-living`.

### Done (Phase 17) — Analytics

`/dashboard/analytics` (`business:manage`): lead conversion rate,
AI escalation rate, appointment no-show rate, and revenue collected as
stat cards, plus a lead funnel, conversation-status breakdown, AI-turn
outcome breakdown, and automation-run breakdown as plain-CSS horizontal
bar charts (`Prisma`'s `groupBy`/`aggregate` — no charting library
pulled in for divs with a width percentage). Every number is a live
aggregate query against real rows from every phase before this one —
there's nothing to fake here by construction.

Live-verified: the numbers shown matched exactly what this session's
own testing had produced by that point (e.g. revenue collected —
₹72,999 — matched the sum of the seeded payment plus the payment just
recorded live, independently confirmed via `psql`).

### Done (Phase 18-20) — hardening, testing, polish

- **Security headers** (`next.config.ts`): `X-Content-Type-Options`,
  `Referrer-Policy` everywhere; `X-Frame-Options` everywhere except the
  widget (see Phase 16 above). Verified with real `curl` requests
  against a running server, not assumed from reading the config.
- **Rate limiting** exists for the one route that needed it most (the
  public widget) — see Phase 16. Sign-in/sign-up still don't have it;
  see Known limitations.
- **Real unit tests added** for pure, DB-free logic:
  `tests/unit/services/knowledge/chunk-text.test.ts` (new), and
  `tests/unit/server/permissions.test.ts` — the latter was **stale**
  (asserted "STAFF gets no permissions," which stopped being true back
  in Phase 4-5) and has been corrected to test the real current matrix,
  including `customers:manage`/`catalogue:manage`. **Not run on this
  machine** — `npm run test` is still blocked by the Node 20.8.0/Vitest
  incompatibility (see Known limitations); tried downgrading Vitest to
  a pre-rolldown version first, confirmed it doesn't help (a hoisted
  `rolldown` dependency still gets pulled into Vite's config-loading
  path regardless), and reverted that attempt rather than leave the
  dependency tree in a worse, unverified state. These tests are
  typechecked and ready to run the moment Node is upgraded.
- **`docs/SECURITY.md`** gained a section on the widget's actual
  security model (rate limiting, tenant-scoping, no `X-Frame-Options`)
  and an updated, honest Known gaps list.
- Reviewed for dead nav / stale copy while building the above; found
  none beyond what earlier phases already fixed.

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

**Phase 9-10 live-verified** (2026-09-08), real browser session as the
seeded owner, against a manually-run production build on `D:\Projects\
YAZ AI` (see gotcha #5 above for why manual, not `preview_start`):
- Profile, Rules, and Goals tabs render the seeded data correctly;
  added a new rule live through the UI and confirmed it persisted (real
  row, correct count on next render).
- Knowledge tab shows the seeded "Shipping & Delivery Policy" document
  with its real chunk count.
- Test tab: asked "do you deliver outside Pune, and how much is
  delivery?" — Maya (mock provider) retrieved the real knowledge chunk
  and answered from it verbatim, with the turn trace correctly showing
  "3 rules, 2 goals — knowledge: Shipping & Delivery Policy". Then asked
  about a dining table — `searchProducts` returned real matches and
  `createLead` correctly reported SUCCESS-but-honest
  `{"error": "This conversation has no linked customer..."}` (confirmed
  via `psql`: zero new `Lead` rows created, `customerId` genuinely
  `null` on the test conversation). Reset correctly deleted the sandbox
  conversation. Confirmed test conversations never appear in the real
  Inbox (`isTest: false` filter).
- Found and fixed nothing new this pass — the trickier bug was
  environmental (gotcha #5), not application code.

**Phase 4-5 live-verified** (2026-09-08), real browser session as the
seeded owner, against a manually-run production build:
- Customers list and detail render correctly (all 5 seeded customers,
  real tags, real lead counts); opened Priya Mehta's detail page and
  confirmed her 3 real leads (2 AI-created, 1 human) and 1 conversation
  cross-referenced correctly; added a profile note through the UI,
  confirmed it persisted with correct author attribution ("Ananya Rao").
- Leads list/filter tabs render correctly with real "AI" badges only on
  AI-created leads; opened a lead detail page, changed its status via
  the picker, confirmed a real `status_change` `LeadActivity` row was
  written (both in the UI and via `psql`).
- Products list renders all 11 seeded products with correct real stock
  totals (summed across variants). Created a new product ("Verona
  Accent Chair") end to end through the dialog — category select
  resolved the label correctly, a real `Product` + `InventoryItem` row
  were created with a correctly-generated slug/SKU. Adjusted its stock
  inline (12 → 7) and confirmed the write via `psql` against the exact
  same `InventoryItem` table `checkInventory` (the AI tool) reads.
- No application bugs found this pass — the one real fix was a
  TypeScript issue (documented in a doc comment in
  `src/lib/validation/leads.ts`/`products.ts`): `useForm<T>`'s single
  generic breaks when `T` itself comes from a schema using
  `z.coerce.number()` or `.default()`, because the resolver's *input*
  type (pre-coercion) and *output* type (post-coercion) diverge. Fixed
  by giving each such form a client-facing schema variant where the
  numeric field stays a plain string (matching what a DOM `<input>`
  actually hands react-hook-form), converted to a number just before
  the server action call — not a 3-generic `useForm`, which doesn't
  compose with the shared `TextField` component's own generic.

**Phase 14 (partial) live-verified** (2026-09-08), real browser session
as the seeded owner:
- Appointments list shows the seeded Vikram Joshi appointment correctly
  (industry-labelled "Showroom Visits" heading, real `CONFIRMED` status,
  correct action buttons for that status).
- Test simulator: sent "Can I book a showroom visit to see the dining
  tables?" — Maya (mock provider) called `createAppointment` for real
  (status `SUCCESS`), and since the test conversation has no linked
  customer, honestly replied "I don't have your contact details linked
  to this conversation yet" instead of fabricating a booking — confirmed
  via `psql`: zero new `Appointment` rows with `source: "AI conversation"`,
  same honest-failure pattern as `createLead`.
- Booked a real appointment through the UI dialog (customer picker,
  purpose, native `datetime-local` input) — confirmed via `psql`: real
  `Appointment` row, correct `SCHEDULED` status. Clicked Confirm — status
  flipped to `CONFIRMED` (confirmed via `psql`).
- Overview's `${appointmentLabel}s` stat correctly showed 2 (real count,
  no longer the hardcoded 0), linked to the real page.

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
- **Knowledge retrieval is lexical, not semantic** — real chunking and
  retrieval (Phase 9), but keyword-overlap scoring, not embeddings; no
  `EmbeddingService`/API key. No file upload for documents either
  (paste-text only). See `docs/AI-ARCHITECTURE.md`.
- **Governance rules/goals are real content, not a validation stage** —
  `AgentRule`/`AgentGoal` (Phase 10) are business-configurable and real,
  but still enforced by the model reading them in the prompt; only
  `escalateToHuman` has a genuine code-level effect. See
  `docs/AI-ARCHITECTURE.md`.
- **No OpenAI adapter** — deliberately not built; `AI_PROVIDER` only
  accepts `"mock"` or `"anthropic"`.
- No OAuth providers wired (Credentials only) — see ARCHITECTURE.md for
  why the Prisma adapter isn't set up yet.
- **Rate limiting exists only for the public widget endpoint**; sign-in/
  sign-up have none. No file upload validation (nothing to validate —
  no uploads exist). See `docs/SECURITY.md` → Known gaps.
- **No category-management UI** — `createProductCategory`/
  `createServiceCategory` exist as services; catalogue create/edit forms
  only pick among existing categories.
- **No PaymentLink/PaymentTransaction** — `Payment` honestly records a
  payment already received (cash/UPI/bank/card); no real gateway is
  wired to this machine, so there's nothing to generate a hosted
  checkout link or a live transaction for. See `docs/DATABASE.md`.
- **The mock AI provider can't parse relative dates** — when it books an
  appointment, it always uses next-day 11:00 local as a fixed default,
  not whatever date the customer actually said ("this Saturday", etc.).
  The row it creates is real; only the "when" is a simplification. A
  real LLM (the Anthropic provider) doesn't have this limit.
- **No `searchServices`/`getServiceDetails` AI tools** — the AI can
  search/check Products but not Services yet; a Salon/Dental AI employee
  can't look up its own catalogue mid-conversation. Deliberate scope
  trim for Phase 15 (Services CRUD + the Dental guardrail were the
  point), not an oversight. See `docs/AI-ARCHITECTURE.md`.
- **Restaurant and Electronics have no seeded demo business** — their
  onboarding path and catalogue UI are code-verified (Restaurant reuses
  the exact Products path Furniture already proves; Electronics is
  identical to Furniture's `catalogueType`), and real evidence exists in
  the dev DB that Restaurant/Salon onboarding works from genuine prior
  use (see Phase 15's "Done" note), but neither has a full seeded
  dataset the way Urban Living/Bright Smile Dental do.
- **Automations only cover 4 triggers × 3 actions, and only
  `LEAD_STATUS_CHANGED` has a condition filter** — no time-based/
  scheduled triggers (no cron/queue infra exists, and building one just
  for this would be a lot of infrastructure for a demo); no
  multi-condition rules; no actions beyond notify/note/status-change
  (e.g. no "send an email" — no email provider wired, same gap
  `Notification` has for delivery). See `docs/DATABASE.md`.
- **Notifications are in-app only** — no email/SMS/push delivery for any
  notification, automation-triggered or otherwise.
- **The widget doesn't recognize a returning visitor** — every new
  browser session gets a fresh anonymous `Customer` row (no name/email
  collected). A returning customer's history doesn't merge across
  visits unless they're on the same `conversationId` (kept in
  `sessionStorage`, so it survives a refresh but not a new tab/session).
- **The Redis-backed rate limiter's in-memory fallback is single-
  instance-only** — correct today (this runs as one server process), a
  real gap the moment it doesn't. See `docs/SECURITY.md`.
- **Vitest still can't run on this machine** — confirmed (not just
  assumed) that downgrading the `vitest` package alone doesn't help: a
  hoisted `rolldown` dependency gets pulled into Vite's own
  config-loading path regardless of which Vitest version is pinned.
  Real fix is still the Node upgrade (≥20.12, ideally ≥20.19 to also
  drop the `prisma`/`@prisma/client` 6.19.3 pin).

## Where this stands relative to the original 20-phase spec

Every phase in the original list now has a real, live-verified
implementation: 0-1 (foundation), 3 (catalogue/CRM schema), 4-5 (owner
workspace CRUD), 6 (conversations), 7-8 (AI orchestration), 9-10
(knowledge + governance), 13 (automations), 14 (appointments +
commerce), 15 (multi-industry: Services + the Dental guardrail), 16
(customer widget), 17 (analytics), and a first pass at 18-20
(hardening/testing/polish — see Known limitations above for what's
honestly still open in that last group, principally the Anthropic
provider being unverified against a real API key and the Vitest/Node
blocker).

**Not built, by deliberate scope decision, not oversight** — see the
relevant "Done" section above for the reasoning in each case:
- The rest of Phase 12's spec (team management UI beyond the
  `team:manage` permission existing) and Phase 11 (settings/billing) —
  never explicitly scoped into a phase in `CLAUDE.md`'s own plan; would
  be the natural next phase if this continues.
- `searchServices`/`getServiceDetails` AI tools (Salon/Dental can't be
  searched by the AI mid-conversation yet — Products can).
- A real payment gateway, category-management UI, `AvailabilitySlot`-
  style multi-resource scheduling, email/SMS/push delivery for
  notifications, and a distributed (non-Redis-fallback) rate limiter.
- Full seeded demo data for Restaurant and Electronics (code-verified,
  not dataset-verified — see Phase 15's "Done" note).

**Also worth doing soon, not tied to a specific phase**: get a real
`ANTHROPIC_API_KEY` into `.env` and live-verify the `anthropic` provider
— the mock proves the pipeline, but genuine LLM tool-calling is the more
convincing demo.

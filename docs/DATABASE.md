# YAZ AI — Database

Schema lives at [`prisma/schema.prisma`](../prisma/schema.prisma). This
document explains the reasoning; the schema file itself is the source of
truth for field-level detail.

## What exists today

```
User ──< OrganizationMember >── Organization ──< Business >──< AIAgent
                                      │                │
                                      └──< AuditLog >───┘

Business ──< ProductCategory ──< Product ──< ProductVariant
         ──< ServiceCategory ──< Service
         ──< InventoryItem (one per Product, or per ProductVariant)
         ──< CustomerTag
         ──< Customer ──< CustomerNote
                       ──< Lead ──< LeadActivity
                       ──< Conversation ──< Message
                                        ──< AgentExecution ──< AgentAction

AIAgent ──< AgentExecution
```

- **User** — one row per human. `passwordHash` (bcrypt, 12 rounds) backs
  the Credentials provider. No OAuth account/session tables yet — see
  ARCHITECTURE.md on why the Prisma adapter isn't wired in.
- **Organization** — the workspace. Has a unique `slug`. A user can
  belong to more than one (schema supports it); onboarding today only
  ever creates one per new user.
- **OrganizationMember** — the join row carrying `role` (`OWNER` /
  `ADMIN` / `MANAGER` / `STAFF`). This is the row every authorization
  check ultimately reads (`src/server/authorization/permissions.ts`).
- **Business** — one operational business under an Organization. Carries
  `industry` (enum: `FURNITURE` / `RESTAURANT` / `SALON` / `DENTAL` /
  `ELECTRONICS`), `timezone`, `currency`. `onboardedAt` distinguishes "has
  completed onboarding" without needing a separate state machine.
- **AIAgent** — deliberately minimal right now: `name`, `title`, `status`.
  Phase 7–10 expands this into the full agent governance model
  (personality, goals, capabilities, rules, knowledge, tools,
  permissions, escalation rules) described in AI-ARCHITECTURE.md — those
  will be separate related models (`AgentConfiguration`,
  `AgentPersonality`, `AgentRule`, ...), not more columns bolted onto this
  one table.
- **AuditLog** — append-only. Every consequential action writes here
  through `src/services/audit/log.ts`, which is intentionally the *only*
  code path that writes to this table. Currently logs `user.registered`
  and `business.onboarded`; Phase 7+ adds `AgentDecision` / `AgentAction`
  /`ToolExecution` events, which is what powers the "AI Activity" feed
  (spec section 18) — the UI never fabricates activity entries
  independent of what's actually in this table.
- **Product / ProductCategory / ProductVariant / InventoryItem** — covers
  Furniture, Electronics, and Restaurant-menu-as-products (spec section
  22). `ProductVariant` is optional per product — a product with no
  meaningful variation (a single-SKU armchair) skips it entirely and gets
  one `InventoryItem` with `variantId: null`; a product with real
  variation (a table in 3 finishes) gets one `InventoryItem` per variant
  instead. `metadata: Json?` on `Product` holds industry-specific
  attributes (material/dimensions for furniture, specs/warranty for
  electronics) that don't earn dedicated columns yet — read by the
  `searchProducts`/`getProductDetails` tools once Phase 8 exists.
- **Service / ServiceCategory** — covers Salon and Dental. Structurally
  parallel to Product/ProductCategory rather than reusing the same table,
  because a service's meaningful fields (`durationMinutes`) and a
  product's (`images`) genuinely differ — a shared table would need
  nullable columns for whichever type a row isn't.
- **Customer / CustomerNote / CustomerTag** — the CRM (spec section 19).
  `tags` is an implicit Prisma many-to-many (no join model needed yet —
  add one later only if tagging itself needs metadata, e.g. `taggedAt`).
- **Lead / LeadActivity** — spec section 20. `LeadActivity` is the
  timeline the Leads UI reads; entries are plain CRM events (`created`,
  `note`, `status_change`) today. Once Phase 7+ exists, real AI
  qualification signals become their own `LeadActivity` rows written
  from actual agent execution — never seeded or fabricated ahead of that
  (see `prisma/seed.ts`'s doc comment).
- **Conversation / Message** — spec sections 6, 11, 17. `status` is one
  of the four states spec section 11 names (`AI_HANDLING` /
  `HUMAN_NEEDED` / `HUMAN_HANDLING` / `RESOLVED`) — **all four are real
  and live-verified** as of Phase 7-8: new conversations start
  `AI_HANDLING`, `escalateToHuman` sets `HUMAN_NEEDED`, a staff reply
  sets `HUMAN_HANDLING`, "Return to AI" sets `AI_HANDLING` (and re-runs
  the orchestrator if there's an unanswered customer message waiting).
  `Message.senderType: AI` is likewise real now — Maya's replies are
  persisted as ordinary `Message` rows. No `ConversationParticipant` or
  `MessageAttachment` table yet: a single `assignedToUserId` on
  `Conversation` covers "who's handling this" until multi-participant
  tracking is actually needed, and attachments wait for the file-storage
  abstraction (Phase 9).
- **AgentExecution / AgentAction** — spec section 7/18. One
  `AgentExecution` per agentic turn (`src/services/ai/orchestrator.ts`),
  one `AgentAction` per tool call within it. `AgentExecution.trace` is a
  structured JSON step log — the literal data source for the Inbox's "AI
  activity" panel and, later, the Test Employee simulator's trace view
  (spec section 14) — nothing there is rendered independent of a real
  row here. No separate `AgentDecision` table (see AI-ARCHITECTURE.md) —
  a "decision" that isn't a tool call is a step within
  `AgentExecution.trace` instead of its own row, revisited if the trace
  ever needs to be queried/filtered independently rather than just
  displayed.

Seed data for all of the above lives in
[`prisma/seed.ts`](../prisma/seed.ts) — one realistic business (Urban
Living, furniture) with 11 products across 4 categories (some with
color/finish variants and real inventory counts), 5 customers, 5 leads
spread across every `LeadStatus`, and 3 conversations (one resolved, two
being handled) with realistic multi-message threads. Idempotent — safe
to re-run via `npm run db:seed`.

## Why cascade behavior is set the way it is

- `OrganizationMember`, `Business` → `onDelete: Cascade` from their parent
  (`Organization`) — a workspace's membership and businesses have no
  independent existence.
- `AIAgent` → `Cascade` from `Business` — same reasoning.
- `AuditLog`'s foreign keys → `onDelete: SetNull` — an audit trail should
  outlive the thing it describes being deleted, not disappear with it.
- Catalogue/CRM children (`Product`, `Service`, `Customer`, `Lead`, ...) →
  `Cascade` from `Business` — same "no independent existence" reasoning.
  Within that: `Product` → category `SetNull` (deleting a category
  shouldn't delete its products, just uncategorize them); `Lead` →
  customer `SetNull` (a lead can outlive the customer record it started
  from); `InventoryItem`/`ProductVariant` → `Cascade` from `Product`
  (stock and variants are meaningless without the product they belong to).
- `Message` → `Cascade` from `Conversation`; `Conversation.customerId` →
  `SetNull` (a conversation record and its transcript should outlive a
  deleted customer, same reasoning as `Lead.customerId`).
  `Conversation.assignedToUserId` and `Message.senderUserId` → `SetNull`
  (losing the user who handled something shouldn't delete the history of
  what happened).
- `AgentExecution` → `Cascade` from `Business`/`Conversation`/`AIAgent`
  (an execution has no meaning outside the conversation it happened in);
  `AgentAction` → `Cascade` from `AgentExecution`. `AgentExecution.
  triggerMessageId` → `Cascade` (the execution IS a response to that
  message — no message, no execution); `replyMessageId` → `SetNull`
  (the execution record should outlive its reply message being deleted).

## Tenant isolation, structurally

Every model below `Organization` carries an explicit foreign key back up
the tenancy chain (`organizationId` or `businessId`), each indexed. This
isn't just for query performance — it's what makes "always filter by
tenant" possible to enforce consistently in the service layer instead of
by convention. See [SECURITY.md](./SECURITY.md).

## What's coming (by phase, not yet in the schema)

- **Phase 9–10 (knowledge + business-configurable governance)**:
  `AgentConfiguration`, `AgentPersonality`, `AgentCapability`,
  `AgentRule`, `AgentGoal`, `KnowledgeDocument`, `KnowledgeChunk`,
  `KnowledgeSource`. (`Tool`/`ToolPermission`/`ToolExecution` as
  database-backed config are also still future — today's tool registry
  is code, in `src/services/ai/tools/`, not data.)
- **Phase 13 (automations)**: `Automation`, `AutomationTrigger`,
  `AutomationAction`, `WorkflowExecution`.
- **Phase 14 (commerce)**: `Appointment`, `AppointmentType`,
  `AvailabilitySlot`, `Quotation`, `QuotationItem`, `Order`, `OrderItem`,
  `Payment`, `PaymentLink`, `PaymentTransaction`.
- Also queued: `Notification`, `Integration`, `Subscription`.

Each addition gets the same treatment as what's here: a tenant foreign
key, indexes on every foreign key, and cascade behavior decided
deliberately rather than left at the Prisma default.

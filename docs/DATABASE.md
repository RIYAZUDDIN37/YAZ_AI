# YAZ AI — Database

Schema lives at [`prisma/schema.prisma`](../prisma/schema.prisma). This
document explains the reasoning; the schema file itself is the source of
truth for field-level detail.

## What exists today

```
User ──< OrganizationMember >── Organization ──< Business >──< AIAgent
                                      │                │
                                      └──< AuditLog >───┘
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

## Why cascade behavior is set the way it is

- `OrganizationMember`, `Business` → `onDelete: Cascade` from their parent
  (`Organization`) — a workspace's membership and businesses have no
  independent existence.
- `AIAgent` → `Cascade` from `Business` — same reasoning.
- `AuditLog`'s foreign keys → `onDelete: SetNull` — an audit trail should
  outlive the thing it describes being deleted, not disappear with it.

## Tenant isolation, structurally

Every model below `Organization` carries an explicit foreign key back up
the tenancy chain (`organizationId` or `businessId`), each indexed. This
isn't just for query performance — it's what makes "always filter by
tenant" possible to enforce consistently in the service layer instead of
by convention. See [SECURITY.md](./SECURITY.md).

## What's coming (by phase, not yet in the schema)

- **Phase 3 (full domain model)**: `Product`, `ProductVariant`,
  `ProductCategory`, `InventoryItem`, `Service`, `ServiceCategory`,
  `Customer`, `CustomerNote`, `CustomerTag`, `Lead`, `LeadActivity`.
- **Phase 6 (conversations)**: `Conversation`, `ConversationParticipant`,
  `Message`, `MessageAttachment`.
- **Phase 7–9 (agent + knowledge)**: `AgentConfiguration`,
  `AgentPersonality`, `AgentCapability`, `AgentRule`, `AgentGoal`,
  `KnowledgeDocument`, `KnowledgeChunk`, `KnowledgeSource`.
- **Phase 8 (tools)**: `Tool`, `ToolPermission`, `ToolExecution`,
  `AgentExecution`, `AgentAction`, `AgentDecision`.
- **Phase 13 (automations)**: `Automation`, `AutomationTrigger`,
  `AutomationAction`, `WorkflowExecution`.
- **Phase 14 (commerce)**: `Appointment`, `AppointmentType`,
  `AvailabilitySlot`, `Quotation`, `QuotationItem`, `Order`, `OrderItem`,
  `Payment`, `PaymentLink`, `PaymentTransaction`.
- Also queued: `Notification`, `Integration`, `Subscription`.

Each addition gets the same treatment as what's here: a tenant foreign
key, indexes on every foreign key, and cascade behavior decided
deliberately rather than left at the Prisma default.

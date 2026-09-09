# YAZ AI — AI Architecture

**Status: the core orchestration engine, knowledge retrieval, and
business-configurable governance are all real and live-verified**
(Phase 7-10). What's left design-only is called out explicitly below —
mainly real (semantic) embeddings and a distinct rule-*validation*
pipeline stage, as opposed to rules as prompt content.

## The abstraction layer, as built

```
AIProvider          — src/services/ai/provider.ts. The only thing that
                       knows which vendor is active (AI_PROVIDER env var).
                       mock (default) and anthropic exist; openai does not
                       (deliberately deferred — see "What's not built" below).
ToolRegistry         — src/services/ai/tools/registry.ts. The fixed set
                       of actions the AI may take. 5 tools exist today.
KnowledgeRetriever   — src/services/knowledge/retrieve.ts. Real, lexical
                       (keyword-overlap) retrieval over KnowledgeChunk
                       rows — see "Knowledge retrieval" below.
AgentOrchestrator    — src/services/ai/orchestrator.ts (`runAgentTurn`).
                       Wires the above into the pipeline below.
```

There's no `EmbeddingService` — no API key configured for one on this
machine, so "Understanding" comes from conversation history +
business/industry context + tool results + real-but-lexical knowledge
retrieval + owner-configured rules/goals, not semantic search over a
business's own uploaded documents (yet).

### The mock adapter (`src/services/ai/providers/mock.ts`) — default, live-verified

Deterministic, keyword-based "understanding" — genuinely simple pattern
matching, not a fake success path. What it triggers is simulated;
**everything it does is real**: every tool call it makes queries and
writes the actual database through the exact same `ToolRegistry` the
real provider uses. Its imprecision is honest and visible — e.g. a
message mentioning "coffee table" gets reduced to the single keyword
"table," which can surface a `Willow Bedside Table` alongside the
`Aster Coffee Table` in `searchProducts` results. A real LLM wouldn't
make that mistake; the mock's job is to prove the pipeline works, not to
approximate model intelligence.

### The Anthropic adapter (`src/services/ai/providers/anthropic.ts`) — implemented, not yet live-verified

A manual tool-calling loop against the Claude Messages API
(`@anthropic-ai/sdk`), model configurable via `AI_CHAT_MODEL` (default
`claude-opus-5`). Deliberately the manual loop rather than the SDK's
beta tool runner — the orchestrator needs to log every tool call itself
between steps, which the manual loop's explicit per-iteration control
gives directly. Capped at 6 tool-call iterations; a `refusal` stop
reason or hitting the cap both escalate to a human rather than showing
the customer anything raw. **This machine has no `ANTHROPIC_API_KEY`
configured**, so this path is implemented and typechecked but not yet
exercised against the real API — see CLAUDE.md.

## The pipeline (spec section 8), as built

```
Customer Message                          (a real Message row, senderType CUSTOMER)
  → Conversation Context                  (prior Messages in the thread)
  → Business Context                      (business name/industry, agent name/title/tone)
  → Knowledge Retrieval                   (lexical match over KnowledgeChunk — Phase 9)
  → Rules + Goals                         (active AgentRule/AgentGoal rows — Phase 10)
  → AIProvider.runTurn(...)               (intent understanding + tool loop, in one call)
      → Tool Selection + Execution        (ToolRegistry — permissioned, Zod-validated, logged)
      → Response Generation
  → Customer Response                     (a real Message row, senderType AI)
  → Agent Activity Log                    (AgentExecution + one AgentAction per tool call)
```

Knowledge retrieval and rules/goals are real pipeline stages now (Phase
9-10) — see the sections below for exactly what "real" means for each. A
separate "Safety / Business Rule Validation" *stage* still isn't wired
in as distinct from prompt content — see "What's not built" below. Every
execution writes an `AgentExecution` row (status `SUCCESS` / `ESCALATED`
/ `ERROR`, a one-line `summary`, and a structured `trace` array — now
including a `context` step recording exactly which rules/goals/knowledge
chunks were used) plus one `AgentAction` row per tool call. This is the
literal data source the Inbox's context panel *and* the Train AI
Employee page's Test tab read for "AI activity" — nothing there is
fabricated independent of a real execution.

## Tools — 5 implemented, real, live-verified

The AI never receives a database handle. It can only call functions in
`ToolRegistry` (`src/services/ai/tools/`), each with a name/description
(what the model sees), a JSON Schema (the API's tool definition) *and* a
Zod schema (re-validates the model's actual input before it ever touches
the database — defense in depth against a malformed or adversarial
call), and full logging of every call (`executeTool` in `registry.ts`
never lets a tool throw past it — errors come back as a structured
result, not an unhandled exception that kills the turn).

| Tool | Does | Verified |
|---|---|---|
| `searchProducts` | Query -> real `Product` rows (keyword + max price) | ✅ live |
| `checkInventory` | Real `InventoryItem` stock, by product id or name | ✅ live |
| `createLead` | Creates a real `Lead` linked to the conversation's customer | ✅ live |
| `createAppointment` | Books a real `Appointment` (Phase 14, industry-labelled) linked to the conversation's customer | ✅ live |
| `escalateToHuman` | Sets the conversation to `HUMAN_NEEDED` — this **is** the governance backbone (see below) | ✅ live |

`createAppointment` needs a real date/time. The mock provider is honest
about the limit this exposes: it can't parse "this Saturday" into a real
date the way an LLM would, so it always books next-day at 11:00 local
time when a booking keyword matches (`src/services/ai/providers/mock.ts`)
— the appointment row itself is real, only the "when" is a fixed
default. The Anthropic provider has no such limit; a real model resolves
relative dates from the conversation itself.

Not yet built: `getProductDetails`, `searchServices`, `getServiceDetails`,
`checkAvailability`, `updateLead`, `getCustomer`, `updateCustomer`,
`cancelAppointment`, `rescheduleAppointment`,
`createQuotation`, `getQuotation`, `createOrder`, `getOrderStatus`,
`generatePaymentLink`, `sendNotification`, `createFollowUp` — most of
these need models that don't exist yet (Quotation, Order —
Phase 14).

## Knowledge retrieval — real, lexical (Phase 9)

`src/services/knowledge/retrieve.ts`'s `retrieveKnowledge()` scores real
`KnowledgeChunk` rows against the customer's message by keyword overlap
and returns the top matches with their source document attributed.
`runAgentTurn` calls it before building the system prompt, folds the
results into the prompt text (with a citation instruction: "according to
your Shipping Policy..."), and — because the mock provider can't parse a
system prompt, only keywords — also passes the retrieved chunks to
`AIProvider.runTurn` as a separate `knowledgeContext` param that the mock
provider genuinely reads (`src/services/ai/providers/mock.ts`): if no
product/escalation keyword matches, but a knowledge chunk does, it
replies from that chunk's real content. Live-verified: asking Maya
(mock provider) "do you deliver outside Pune?" retrieves the real
Shipping & Delivery Policy chunk and answers from it.

What's honestly not here: semantic (embeddings-based) search. Chunking
(`src/services/knowledge/chunk-text.ts`) is real and paragraph-aware;
retrieval is real keyword-overlap scoring, not vector similarity. There's
no `EmbeddingService` and no API key configured for one — swapping in
real embeddings later only needs to replace `scoreOverlap()` in
`retrieve.ts`, not any caller. There's also no file-storage abstraction
yet, so a `KnowledgeDocument` is pasted/plain text today, not an
uploaded file.

## Governance — real, business-configurable content (Phase 10)

Owners now author real `AgentRule` and `AgentGoal` rows from the Train AI
Employee page (`/dashboard/agent`), not prose I hardcode. `runAgentTurn`
fetches each agent's active rules/goals (ordered) and injects them into
the system prompt alongside the one rule that's always there —
"escalate instead of guessing at something outside your authority."
**That one rule is still the only governance with a real code-level
effect**: `escalateToHuman` actually sets `HUMAN_NEEDED` in the database,
not just the model choosing polite words. Owner-authored rules/goals are
real, configurable, per-business *content* fed to the model — a
genuinely different and more useful state than Phase 7-8's "one
hardcoded rule for everyone" — but they're still enforced by the model
following instructions, not by a separate validation step that checks
the AI's response against each rule before it ships. That's the gap
"governance is enforced code, not a prompt instruction" still names:
Phase 10 made the *content* real and configurable; a distinct
*validation* stage remains future work (see below).

## How a conversation actually reaches the AI

- **New conversation** (`startConversation`): starts `AI_HANDLING`
  immediately — a real inbound contact gets Maya's first attempt, same
  as production would.
- **Follow-up customer message on an open conversation**
  (`logCustomerMessage`): if the conversation is `AI_HANDLING`, runs the
  same orchestrator turn.
- **A staff reply** (`sendMessage`) is an implicit takeover — always
  moves the conversation to `HUMAN_HANDLING`, regardless of its prior
  status.
- **"Return to AI"** (`updateConversationStatus` → `AI_HANDLING`): if the
  last message in the thread is an unanswered customer message, runs the
  orchestrator immediately instead of leaving the conversation idle.

All four are live-verified, including the full round trip:
AI handles → escalates on an angry message → staff takes over → staff
returns it to AI → AI picks the next customer message back up correctly.

## The Train / Test AI Employee UI (Phase 9-10)

`/dashboard/agent` (`business:manage` only — STAFF handles conversations,
not the AI's configuration): Profile (name/title/tone/custom
instructions), Rules, Goals, and Knowledge tabs are straightforward CRUD
over the models above. The Test tab is the spec section 14 simulator —
it calls `sendTestMessage` → the exact same `runAgentTurn` a real
conversation uses, not a separate mocked chat. The only difference is
`Conversation.isTest: true` and `customerId: null`: sandbox conversations
are real rows (real `Message`, `AgentExecution`, `AgentAction`), but
excluded from the real Inbox query and from ever touching real CRM data
— `createLead` genuinely returns "no linked customer" in the sandbox
rather than writing a fake `Lead`, which the Test tab surfaces
transparently in its turn trace rather than hiding it. Live-verified:
seeded rules/goals/knowledge show up correctly, a sandbox message
retrieves the real knowledge chunk and cites it, a product query
triggers `searchProducts` + the honest `createLead` "no customer" result,
and Reset deletes the sandbox conversation (cascades to its messages/
executions) cleanly.

## What's not built yet

- **Semantic (embeddings-based) knowledge retrieval** — today's
  retrieval is real but lexical (keyword overlap); see "Knowledge
  retrieval" above. No `EmbeddingService`, no API key configured for one.
- **File uploads for knowledge documents** — no storage abstraction yet;
  documents are pasted/plain text.
- **A separate "Safety / Business Rule Validation" pipeline stage** —
  owner-authored rules/goals (Phase 10) are real and business-configurable
  now, but still enforced by the model reading them in the prompt, not a
  distinct post-generation check step. See "Governance" above.
- **The OpenAI adapter** — deliberately not built. Anthropic was chosen
  as the one real provider to implement well rather than splitting
  effort across two; `AI_PROVIDER` only accepts `"mock"` or `"anthropic"`.
- **Dental's never-diagnose guardrail — the *content* is real (Phase
  15), the *enforcement mechanism* still isn't.** Bright Smile Dental
  (`prisma/seed.ts`'s second demo business) has two real `AgentRule`
  rows — "never diagnose a condition, suggest a treatment, or comment on
  symptoms/X-rays" and "never quote a final price without a dentist
  confirming the procedure" — injected into Aria's system prompt exactly
  like any other business's rules (see "Governance" above). What's
  *not* here yet is a distinct validation stage that checks a
  generated response against the rule before it ships — same gap as
  every other business's rules, just now demonstrated on the vertical
  the spec calls out by name.

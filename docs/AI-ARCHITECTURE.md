# YAZ AI — AI Architecture

**Status: the core orchestration engine is real and live-verified**
(Phase 7-8). Knowledge retrieval (RAG) and business-configurable rules
are still design-only — see the sections below marked as such.

## The abstraction layer, as built

```
AIProvider          — src/services/ai/provider.ts. The only thing that
                       knows which vendor is active (AI_PROVIDER env var).
                       mock (default) and anthropic exist; openai does not
                       (deliberately deferred — see "What's not built" below).
ToolRegistry         — src/services/ai/tools/registry.ts. The fixed set
                       of actions the AI may take. 4 tools exist today.
AgentOrchestrator    — src/services/ai/orchestrator.ts (`runAgentTurn`).
                       Wires the above into the pipeline below.
```

`EmbeddingService` and `KnowledgeRetriever` don't exist yet — there's no
`KnowledgeChunk` table (Phase 9). "Understanding" today comes from
conversation history + business/industry context + tool results, not a
business's own uploaded documents.

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
  → Business Context                      (business name/industry, agent name/title)
  → AIProvider.runTurn(...)               (intent understanding + tool loop, in one call)
      → Tool Selection + Execution        (ToolRegistry — permissioned, Zod-validated, logged)
      → Response Generation
  → Customer Response                     (a real Message row, senderType AI)
  → Agent Activity Log                    (AgentExecution + one AgentAction per tool call)
```

Knowledge Retrieval and a separate "Safety / Business Rule Validation"
step aren't wired in as distinct pipeline stages yet — see "What's not
built" below. Every execution writes an `AgentExecution` row (status
`SUCCESS` / `ESCALATED` / `ERROR`, a one-line `summary`, and a structured
`trace` array) plus one `AgentAction` row per tool call. This is the
literal data source the Inbox's context panel reads for "AI activity" —
nothing there is fabricated independent of a real execution.

## Tools — 4 implemented, real, live-verified

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
| `escalateToHuman` | Sets the conversation to `HUMAN_NEEDED` — this **is** the governance backbone (see below) | ✅ live |

Not yet built: `getProductDetails`, `searchServices`, `getServiceDetails`,
`checkAvailability`, `updateLead`, `getCustomer`, `updateCustomer`,
`createAppointment`, `cancelAppointment`, `rescheduleAppointment`,
`createQuotation`, `getQuotation`, `createOrder`, `getOrderStatus`,
`generatePaymentLink`, `sendNotification`, `createFollowUp` — most of
these need models that don't exist yet (Appointment, Quotation, Order —
Phase 14).

## Governance today vs. the design goal

The design goal (spec section 10) is a business-configurable `AgentRule`
model, evaluated before a response ships — not prose in a prompt. That
model doesn't exist yet (Phase 10, "Train your AI employee"). What's
real today is narrower but genuinely enforced: **the one rule that
exists — "escalate instead of guessing at something outside your
authority" — is hardcoded into the system prompt in
`orchestrator.ts`'s `buildSystemPrompt()`, but its enforcement is a real
tool call with a real database side effect** (`escalateToHuman` actually
sets `HUMAN_NEEDED`), not just the model choosing polite words. That's
the meaningful half of "governance is enforced code, not a prompt
instruction" — the *content* of the rule is still prompt-based until
Phase 10 makes it per-business configurable; its *effect* is not.

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

## What's not built yet

- **Knowledge retrieval / RAG** (Phase 9) — no `KnowledgeChunk` table,
  no `EmbeddingService`. See the RAG pipeline design below, unchanged
  from Phase 1.
- **Business-configurable `AgentRule`/`AgentPersonality`/`AgentGoal`**
  (Phase 10) — governance today is one hardcoded rule (above).
- **A separate "Safety / Business Rule Validation" pipeline stage** —
  today, the one rule that exists is baked into the system prompt the
  model sees, not a distinct post-generation check step.
- **The OpenAI adapter** — deliberately not built. Anthropic was chosen
  as the one real provider to implement well rather than splitting
  effort across two; `AI_PROVIDER` only accepts `"mock"` or `"anthropic"`.
- **Dental's never-diagnose guardrail** — lands with that vertical's
  configuration in Phase 15; the mechanism (a rule checked before a
  response ships) is the same one described above, just not written yet.

## RAG pipeline (design only — Phase 9)

```
Upload → Store (S3-compatible storage abstraction) → Extract text
  → Clean → Chunk → Embed (EmbeddingService) → Store (KnowledgeChunk)
  → Index → Available to KnowledgeRetriever, scoped to businessId
```

Retrieval must support semantic search, metadata filtering, and always
returns which source a chunk came from — so a response can say "according
to your delivery policy..." and the owner can see, per document, its
chunks, indexing status, and any processing errors.

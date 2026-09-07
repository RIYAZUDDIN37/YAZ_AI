# YAZ AI — AI Architecture

**Status: design document.** None of the orchestration engine described
here is implemented yet — that's Phases 7–10. This file exists now (Phase
1) so the abstractions below are built to this shape from the start,
rather than retrofitted. Nothing in the current app calls an LLM.

## Why an abstraction layer at all

The spec is explicit: don't hard-code every AI call to one vendor. The
planned modules:

```
AIProvider          — the only thing that knows which vendor is in use.
AIChatService        — chat completion + structured output, provider-agnostic.
EmbeddingService     — text → vector, provider-agnostic.
ToolRegistry         — the fixed set of actions the AI is allowed to invoke.
KnowledgeRetriever   — semantic search over a business's KnowledgeChunks.
AgentOrchestrator    — wires the above into the pipeline below.
```

`AI_PROVIDER` (see `.env.example`) selects the adapter `AIProvider`
constructs: `mock` (default, no key needed), `openai`, or `anthropic`.
The **mock adapter is a real, clearly-labeled development adapter** — not
a fake success path. It returns deterministic, obviously-synthetic
responses so the rest of the pipeline (tool-calling, logging, escalation)
can be built and tested without a paid API key, and nothing in the UI is
allowed to present its output as if a real model produced it.

## The pipeline (spec section 8)

```
Customer Message
  → Conversation Context      (prior messages, current lead/order state)
  → Business Context          (industry config, business settings)
  → Intent / Task Understanding
  → Knowledge Retrieval       (KnowledgeRetriever — scoped to businessId)
  → Agent Decision            (what should happen, incl. "escalate")
  → Tool Selection
  → Tool Execution            (ToolRegistry — permissioned, typed, logged)
  → Tool Result
  → Response Generation
  → Safety / Business Rule Validation   (e.g. "never discount over 10%")
  → Customer Response
  → Agent Activity Log        (AgentExecution / AgentAction / AgentDecision)
```

Every arrow that crosses into "the AI decided/did something" writes an
audit row. That log is both the security trail (docs/SECURITY.md) and the
literal data source for the "AI Activity" feed (spec section 18) and the
Test Employee simulator's trace panel (spec section 14) — the simulator
must call the same `AgentOrchestrator` real conversations use, not a
separate fake implementation.

## Tools, not database access

The AI never receives a database handle. It can only call functions in
`ToolRegistry`, each with:

- a name and description (what the model sees),
- a typed input schema and typed output (Zod, matching the rest of the app),
- an authorization requirement (checked against the agent's configured
  permissions before execution — see AgentGoal/AgentCapability config in
  DATABASE.md's "coming" list),
- audit logging (every call, success or failure),
- explicit error handling — a failed tool call is a result the model has
  to react to, not an unhandled exception.

Planned v1 tools (typed signatures land with Phase 8):
`searchProducts`, `getProductDetails`, `checkInventory`, `searchServices`,
`getServiceDetails`, `checkAvailability`, `createLead`, `updateLead`,
`getCustomer`, `updateCustomer`, `createAppointment`,
`cancelAppointment`, `rescheduleAppointment`, `createQuotation`,
`getQuotation`, `createOrder`, `getOrderStatus`, `generatePaymentLink`,
`sendNotification`, `createFollowUp`, `escalateToHuman`.

## Governance is enforced code, not a prompt instruction

"Never offer more than 10% off" has to be a rule the orchestrator checks
against the tool call / response *before* it reaches the customer, not
just a line in a system prompt hoping the model complies. That's why
`AgentRule` is a first-class model (Phase 7) evaluated in the "Safety /
Business Rule Validation" step above, not prose baked into a prompt
template.

## RAG pipeline (Phase 9)

```
Upload → Store (S3-compatible storage abstraction) → Extract text
  → Clean → Chunk → Embed (EmbeddingService) → Store (KnowledgeChunk)
  → Index → Available to KnowledgeRetriever, scoped to businessId
```

Retrieval must support semantic search, metadata filtering, and always
returns which source a chunk came from — so a response can say "according
to your delivery policy..." and the owner can see, per document, its
chunks, indexing status, and any processing errors.

## Guardrail specific to the Dental industry

The Dental agent must never diagnose or imply medical judgment. This is
enforced the same way discount limits are: a rule evaluated before a
response ships, not a hope embedded in the prompt. Concrete implementation
(pattern-matching + rule config) lands with that vertical's configuration
in Phase 15.

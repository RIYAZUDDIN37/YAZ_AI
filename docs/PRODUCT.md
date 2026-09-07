# YAZ AI — Product

**Tagline**: AI employees that actually work.

## The core idea

Not a chatbot widget. The loop that makes YAZ AI a "worker" and not a
"wrapper":

```
Customer request → AI understands → retrieves business knowledge
  → decides what action is required → calls a real tool → gets a result
  → responds → logs the action → escalates to a human when it should
```

Every reply is traceable to a knowledge source, a business rule, and
(where relevant) a real action taken — not a plausible-sounding guess.

## Industries (one platform, five verticals via configuration)

Defined in [`src/config/industries.ts`](../src/config/industries.ts) —
the single source of truth for industry labels, descriptions, and
per-industry defaults (agent name/title, what "appointment" and
"catalogue" are called). Selected once at onboarding; the underlying
schema and application code stay shared.

| Industry | Handles | Appointment concept |
|---|---|---|
| Furniture Store | Products, materials, inventory, quotations | Showroom Visit |
| Restaurant | Menu, dietary info, delivery | Reservation |
| Salon | Services, staff, packages | Service Appointment |
| Dental Clinic | Doctors, slots, policies — **never diagnoses** | Doctor Appointment |
| Electronics Store | Specs, comparisons, warranties, orders | Store Visit |

The Dental agent's "never diagnoses" constraint is a hard product
requirement, not a nice-to-have — see AI-ARCHITECTURE.md's guardrail
section.

## Roles

`OWNER` / `ADMIN` / `MANAGER` / `STAFF`, centrally defined in
`src/server/authorization/permissions.ts`. See SECURITY.md for how
they're enforced.

## Demo persona (for seed data, Phase 3)

- **Business**: Urban Living — Pune, Maharashtra (furniture)
- **AI employee**: Maya — Customer & Sales Agent

The other four industries get their own seeded configuration alongside
Urban Living, selectable at onboarding — not five separate applications.

## What "done" looks like

An evaluator can, in one sitting: open YAZ AI → understand the product in
seconds → create a business → create an AI employee → configure its
personality → upload knowledge → give it capabilities → define rules →
test it in a live simulator using the *same* orchestration engine real
conversations use → see the AI perform an actual tool call → see the
activity trace → manage customers/leads/appointments/quotations/orders
that resulted from it → take a conversation over from the AI and hand it
back → switch industries and watch the product adapt.

## Current state vs. this vision

See [CLAUDE.md](../CLAUDE.md) → Implementation status for exactly what of
the above exists today versus what's scheduled in which phase. As of
Phase 1: authentication, workspace creation, and industry-scoped
onboarding (business + first AI employee, persisted) are real. Everything
from "upload knowledge" onward is designed (see AI-ARCHITECTURE.md and
DATABASE.md's "coming" sections) but not yet built.

# YAZ AI — Security

## Authentication

- Passwords hashed with `bcryptjs`, 12 rounds (`src/services/auth/register.ts`).
- Sessions are JWT-based (Auth.js v5 Credentials provider,
  `src/server/auth/index.ts`). No session table to manage; the JWT carries
  only `id`, `name`, `email` — see `src/types/next-auth.d.ts` for the
  session shape.
- `AUTH_SECRET` is required (min 16 chars, enforced by `src/lib/env.ts`)
  and must be a real random value in any non-local environment. The
  `.env` committed for local dev is explicitly a dev-only placeholder.

## Authorization — server-side, always

**Rule**: never trust an `organizationId` / `businessId` supplied by the
browser as authorization on its own. Every service function that accepts
one re-derives or re-checks the caller's membership before acting.

Concretely, right now: `completeOnboarding()`
(`src/services/onboarding/complete-onboarding.ts`) receives an
`organizationId` from the client (via a hidden form field populated
server-side at page render) but does not trust it — it looks up the
caller's actual `OrganizationMember` row for that org and checks
`can(role, "business:onboard")` before writing anything. This is the
pattern every future service function follows: **authorize against a
freshly-read DB row, not against a value shipped from the client**, even
when that value was legitimately provided by the current page.

Route-level protection: `src/middleware.ts` blocks unauthenticated
requests to `/dashboard/*` and `/onboarding/*` at the edge. It only checks
"is there a valid session" — it does not (and structurally cannot, since
it runs on the Edge runtime) make tenant/role decisions; those happen in
the layouts (`requireMembership()`,
`src/server/authorization/require-session.ts`) and in the service layer.

Role permissions are centralized in
`src/server/authorization/permissions.ts` (`can(role, permission)`) —
the intent is that no component or route ever compares
`role === "OWNER"` inline; it grows alongside each phase's features
instead.

## Multi-tenancy enforcement

See DATABASE.md for the schema shape. In service code, the pattern is:
resolve the caller's own membership/business from the session, then
scope every query to that `businessId`/`organizationId` — never accept a
tenant ID as sufficient authorization by itself (see above).

## Input validation

Every server action validates its input against a Zod schema
(`src/lib/validation/*`) before touching the database — both the schema
used for client-side RHF validation and the one re-validated server-side
are the same object, so there's no drift between what the UI allows and
what the server accepts.

## Error handling — no leaked internals

`src/lib/errors.ts` defines `AppError` (and `ForbiddenError`,
`NotFoundError`) for expected, user-facing failures. Server actions catch
via `src/lib/handle-error.ts`'s `toActionError()`: an `AppError`'s message
goes to the user; anything else is logged server-side with
`console.error` and the user sees a generic "Something went wrong."
message. No stack traces or raw error objects ever reach the client.

## Secrets

- `src/lib/env.ts` is the only intended reader of `process.env` outside
  `prisma.config.ts` (which the Prisma CLI needs before the app's own env
  validation can run). This makes it straightforward to confirm no secret
  is read into client-bundled code — env access is centralized, and
  nothing in `src/lib/env.ts` is imported from a `"use client"` module.
- `.env` is gitignored; `.env.example` documents every variable without
  real values and is the only env file committed.

## The AI is never trusted with raw access

Documented in full in AI-ARCHITECTURE.md: once the agent orchestration
engine exists (Phase 7+), the model only ever calls typed, permissioned
functions in a `ToolRegistry` — it is never given a database handle or
the ability to run arbitrary queries. Every tool call is authorized
against the agent's configured permissions and logged to `AuditLog`
before its result reaches the model.

## Known gaps (honest, not yet addressed)

These are real gaps, tracked here rather than glossed over:

- **No rate limiting yet.** Sign-in/sign-up actions have no throttling.
  Planned for Phase 18 (security hardening) via a Redis-backed limiter
  (Redis is already provisioned in `docker-compose.yml` for this).
- **No file upload validation yet** — no uploads exist yet (Phase 9).
- **No CSRF-specific handling beyond what Next.js Server Actions provide
  by default** (same-origin enforcement on the action's encrypted
  reference) — revisited in Phase 18.
- **No automated security test suite yet** — Phase 19.

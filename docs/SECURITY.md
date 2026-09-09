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

## The one public, unauthenticated route

Every route in the app requires a session except one: the customer-
facing widget (Phase 16 — `src/app/widget/[slug]/page.tsx` and
`src/app/api/widget/[slug]/message/route.ts`), meant to be embedded in
an `<iframe>` on a business's own website so *their* customers can
chat with the AI without an account. Its security model is different
by necessity, not by oversight:

- **Rate-limited by IP** (`src/lib/rate-limit.ts`), Redis-backed —
  finally a real use for the Redis instance `docker-compose.yml` has
  provisioned since Phase 0-1. Falls back to an in-memory counter if
  Redis is unreachable (fails open on a Redis outage, never hangs the
  widget) — real, but only correct for a single server instance; the
  Redis path is what's correct for however many instances this actually
  runs as.
- **Tenant-scoped by business slug**, and any client-supplied
  `conversationId` is re-validated against that business and
  `isTest: false` before anything is read or written — the same "never
  trust a client-supplied id as authorization" rule as everywhere else
  in the app, just with "no session" instead of "wrong session" as the
  threat being checked for.
- **`X-Frame-Options` is deliberately not sent on `/widget/*`**
  (`next.config.ts`) — the one route that needs to be embeddable
  cross-origin, everything else keeps clickjacking protection.
- Creates a real, minimal `Customer` row ("Website visitor") per new
  conversation — no email/name is collected or required, so there's
  nothing sensitive to leak even if the rate limit were bypassed.

## Known gaps (honest, not yet addressed)

These are real gaps, tracked here rather than glossed over:

- **Sign-in/sign-up still have no rate limiting** — only the public
  widget endpoint does (see above). Auth.js's own credential-stuffing
  protections aside, a dedicated limiter on `/sign-in` and `/sign-up`
  is still worth adding.
- **No file upload validation yet** — no uploads exist yet (Phase 9's
  knowledge documents are pasted text, not files).
- **No CSRF-specific handling beyond what Next.js Server Actions provide
  by default** (same-origin enforcement on the action's encrypted
  reference).
- **No automated security test suite yet** — `tests/unit/` has real
  unit tests (permissions, chunking, slugs) but nothing scanning for
  injection/XSS/auth-bypass classes of bugs specifically.
- **The in-memory rate-limit fallback isn't distributed** — correct
  today (this runs as one instance), a real limitation the moment it
  doesn't.

# CLAUDE.md

Guidance for anyone (human or AI) picking up work on YAZ AI.

## Project overview

YAZ AI is a multi-tenant SaaS platform: businesses configure AI employees
that understand their business (via uploaded knowledge), take real
actions through a permissioned tool registry, talk to customers, and
escalate to a human when a decision is outside what they're allowed to
make. Full product vision: [`docs/PRODUCT.md`](docs/PRODUCT.md).

This is being built in the 20 phases defined in the original spec,
validating (typecheck → lint → build) before moving on from each. This
file's **Implementation status** section below is the authoritative
record of where that stands — trust it over any assumption from the repo
structure alone.

## Architecture at a glance

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full
reasoning. In short: modular monolith, `app/` holds routes only,
`services/` holds business logic and is the only layer that talks to
Prisma for anything non-trivial, `server/` holds request-lifecycle
concerns (auth, authorization, the db client), `lib/` holds cross-cutting
utilities, `config/` holds data-driven configuration (e.g. the five
industries).

**Two non-obvious things that will trip you up if you don't know them:**

1. shadcn/ui here is built on **Base UI**, not Radix. Polymorphism is a
   `render` prop (`<Button render={<Link .../>} />`), not `asChild`.
2. Server actions in this codebase take **typed objects**, not
   `FormData` — RHF validates client-side, then calls the action
   directly with the validated value.

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
- **AI orchestration is entirely unimplemented** — `docs/AI-ARCHITECTURE.md`
  is a design doc for Phases 7–10, not a description of working code.
  Nothing in the app currently calls an LLM.
- No OAuth providers wired (Credentials only) — see ARCHITECTURE.md for
  why the Prisma adapter isn't set up yet.
- No rate limiting, no file upload validation yet (nothing to validate —
  no uploads exist). See `docs/SECURITY.md` → Known gaps.
- Dashboard nav is intentionally minimal (no Inbox/Customers/etc. links)
  because those pages don't exist yet — adding the links before the
  pages would be dead navigation, which the spec explicitly forbids.

## Next steps (in phase order)

1. **Phase 3** — full domain schema: Product/Service catalogue,
   Customer/Lead, migrations (`db:migrate` instead of `db:push`), and
   real seed data for Urban Living (furniture) + the other four
   industries (`docs/PRODUCT.md`).
2. **Phase 4–5** — owner workspace shell (real nav, added page by page
   as each becomes real) + customers/leads/appointments/products CRUD.
3. **Phase 6** — conversation system (Conversation/Message persistence,
   Intercom-style inbox UI).
4. **Phase 7–8** — `AIProvider`/`AIChatService`/`AgentOrchestrator`/
   `ToolRegistry` per `docs/AI-ARCHITECTURE.md`, starting with the mock
   adapter; first real tool calls.
5. **Phase 9–10** — knowledge/RAG pipeline; Train/Test AI employee UI
   (test simulator must call the same orchestrator as real conversations).
6. Continue per the phase list in the original spec; update this file
   after each phase, not just at the end.

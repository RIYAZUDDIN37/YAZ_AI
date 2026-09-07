# YAZ AI — Architecture

This document explains *why* the codebase is shaped the way it is. For
*what* exists right now vs. what's still to come, see [CLAUDE.md](../CLAUDE.md).

## Guiding structure

```
User → Organization → Business → AI Employee(s) → Business Data
```

One person can (eventually) belong to multiple Organizations. One
Organization has one or more Businesses. Every tenant-owned record —
customers, conversations, products, appointments, and so on — hangs off a
`businessId`, and every service-layer query filters by it. See
[SECURITY.md](./SECURITY.md) for how that's enforced.

## Modular monolith, not microservices

Per the spec's own instruction not to overengineer early: this is one
Next.js application with clean internal boundaries, not a constellation of
services. Boundaries are enforced by *where code is allowed to live*, not
by network calls:

```
src/
  app/            Next.js routes only — layouts, pages, route handlers.
                   No business logic lives here. Pages call services.
  components/     Presentational UI. ui/ = shadcn primitives (generated,
                   don't hand-edit). marketing/, dashboard/, form/, shared/
                   = composed from those primitives.
  features/       (reserved) feature-scoped UI + hooks, once a feature is
                   complex enough to outgrow components/ + app/ alone.
  server/         Server-only, request-lifecycle concerns: auth config,
                   the Prisma client singleton, centralized authorization.
  services/       Business logic. This is the layer that talks to the
                   database and enforces rules — pages and actions call
                   into here, never Prisma directly (except trivial reads).
  lib/            Cross-cutting utilities with no business meaning: env
                   validation, error types, slugify, validation schemas.
  config/         Data-driven configuration (e.g. the 5 industries) that
                   shapes behavior without branching code per industry.
  types/           Shared TypeScript types (e.g. next-auth module augmentation).
prisma/           schema.prisma, seed.ts.
docs/             This directory.
```

**Rule of thumb**: if you're tempted to write a Prisma query inside a
component or a route handler, it belongs in `services/` instead. Server
actions (`app/**/actions.ts`) are thin, typed wrappers: validate input →
call a service → map errors → redirect/return. They hold no business logic
themselves.

## Why these specific technology choices

- **Next.js App Router, `src/` dir, TypeScript strict.** Standard for a
  project this size; Server Components + Server Actions remove an entire
  category of hand-rolled REST endpoints for form submissions.

- **Prisma with the classic `prisma-client-js` generator**, not the newer
  `prisma-client` generator that `prisma init` now defaults to. The newer
  generator (output to `src/generated/prisma`, different import path) is
  very recent and less documented; the classic generator (`@prisma/client`
  import) is what virtually every reference and past Prisma project
  assumes, which matters for a portfolio piece meant to be read by other
  developers.

- **Prisma 6.x pinned, not 7.x.** `prisma@7` requires Node ≥20.19; this
  machine runs Node 20.8.0. Prisma 6 is the current stable line and fully
  capable. **Action item**: upgrade Node and revisit Prisma 7 later — see
  CLAUDE.md → Known limitations.

- **NextAuth (Auth.js) v5, Credentials provider, JWT session strategy.**
  No `@auth/prisma-adapter` wiring for now — the adapter's *database*
  session strategy doesn't combine with the Credentials provider (a
  documented Auth.js limitation), and JWT sessions need no adapter at all.
  The package is still installed for when an OAuth provider is added later.
  **Split config** (`server/auth/config.ts` vs. `server/auth/index.ts`) is
  the officially recommended pattern for keeping Prisma (Node-only) out of
  `middleware.ts` (Edge runtime) — see the file comments in both.

- **shadcn/ui on Base UI, not Radix.** The shadcn CLI installed in this
  environment scaffolds components on top of `@base-ui/react`
  (`base-nova` registry), not Radix UI. This matters because Base UI's
  polymorphism convention is a **`render` prop**, not Radix's `asChild` +
  `<Slot>` — e.g. `<Button render={<Link href="/x">Go</Link>} />` instead
  of `<Button asChild><Link href="/x">Go</Link></Button>`. If you're
  pattern-matching against older shadcn/Radix examples, this is the one
  thing that will trip you up. `TooltipProvider` similarly takes `delay`,
  not `delayDuration`.

- **Zod v4** — note the top-level `z.email()` / `z.url()` API (not
  `z.string().email()`), and Zod v4's `safeParse`/`issues` shape used
  throughout `lib/validation/*` and server actions.

- **react-hook-form + a thin `TextField` wrapper** around shadcn's `Field`
  primitives (`Field`, `FieldLabel`, `FieldError`...). shadcn dropped the
  old RHF-coupled `Form`/`FormField` components in favor of these
  unstyled, composable primitives; `components/form/text-field.tsx` is
  the one place that wires `Controller` to them so every form gets
  consistent label/error layout for free.

- **Server actions take typed objects, not `FormData`.** Every form in
  the app uses RHF for client-side validation, then calls the imported
  server action directly from `onSubmit` (inside `startTransition`) with
  the validated object — not `<form action={...}>` with `FormData`
  parsing on the server. This keeps one Zod schema as the single source of
  truth for both client and server validation.

## Environment configuration

`src/lib/env.ts` parses `process.env` through a Zod schema once, at import
time, and throws a readable error listing exactly what's missing/invalid.
Every other module imports `env` from there — nothing reads
`process.env.X` directly outside that file and `prisma.config.ts` (which
the Prisma CLI requires to bootstrap before the app's own env module can
run).

## Local development database

`docker-compose.yml` at the repo root starts Postgres 16 and Redis 7 with
credentials matching `.env.example`. See the Quick start in
[CLAUDE.md](../CLAUDE.md).

## Working in phases

This project is being built in the 20 phases defined in the original
product spec, validating (typecheck → lint → build) at the end of each
before moving to the next. CLAUDE.md's "Implementation status" section is
the authoritative record of where that process currently stands.

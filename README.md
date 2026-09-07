# YAZ AI

> AI employees that actually work.

A multi-tenant SaaS platform where businesses configure AI employees that
understand their business, use real tools, talk to customers, perform
operational tasks, and escalate to humans when they should. See
[`docs/PRODUCT.md`](docs/PRODUCT.md) for the product vision and
[`CLAUDE.md`](CLAUDE.md) for current implementation status.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui (on Base
UI) · PostgreSQL · Prisma · Auth.js v5 · Zod · React Hook Form · Vitest.
Full rationale in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Quick start

Requires Node ≥20.9 (this repo was built against 20.8 with a couple of
package versions pinned down to accommodate that — see
`docs/ARCHITECTURE.md`; upgrading Node is recommended) and Docker.

```bash
cp .env.example .env          # defaults already match docker-compose.yml
docker compose up -d          # Postgres on :5432, Redis on :6379
npm install
npm run db:push               # create tables from prisma/schema.prisma
npm run db:seed               # optional: seed a realistic demo business
npm run dev                   # http://localhost:3000
```

Then either **Build your AI employee** on the landing page → create an
account → complete onboarding (pick an industry, name your AI employee),
or, if you ran `db:seed`, sign in directly with
`owner@urbanliving.test` / `UrbanLiving123!` to see a workspace already
populated with products, customers, and leads.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (single run) |
| `npm run db:push` | Push `schema.prisma` to the database (no migration history — fine for this stage) |
| `npm run db:migrate` | Create a real migration (once schema stabilizes) |
| `npm run db:studio` | Prisma Studio, a GUI over the local database |
| `npm run db:seed` | Run `prisma/seed.ts` |

## Documentation

- [`CLAUDE.md`](CLAUDE.md) — project overview, conventions, current status, next steps
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — why the codebase is shaped this way
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema and what's coming
- [`docs/AI-ARCHITECTURE.md`](docs/AI-ARCHITECTURE.md) — the agent orchestration design
- [`docs/SECURITY.md`](docs/SECURITY.md) — auth, authorization, tenant isolation
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — the product vision and industries

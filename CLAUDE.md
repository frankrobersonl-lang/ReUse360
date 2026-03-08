# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

ReUse360 Plus — AMI-driven irrigation enforcement and reclaimed water conservation platform for Pinellas County Utilities. It detects watering violations via smart meter data (Beacon AMA), manages inspections/permits/complaints, and integrates with Cityworks for service requests.

## Commands

```bash
# Install & setup (first time)
pnpm install
pnpm db:generate          # Generate Prisma client
pnpm db:migrate:dev       # Run migrations (name: "init" on first run)
pnpm db:seed:dev          # Seed development data

# Development
pnpm dev:web              # Next.js on http://localhost:3000
pnpm dev:worker           # Background job runner (NestJS)
pnpm dev                  # Both web + worker via Turbo

# Database
pnpm db:studio            # Prisma Studio GUI
pnpm db:reset             # Drop & recreate (destructive)
pnpm db:migrate           # Deploy migrations (production)
pnpm db:seed:prod         # Seed production data

# Docker (Postgres + pgAdmin + Redis)
docker compose up -d      # Start local services
docker compose down -v    # Stop and delete all data

# Quality
pnpm lint                 # ESLint across all packages
pnpm typecheck            # TypeScript --noEmit across all packages
pnpm build                # Full production build

# Single-package commands
pnpm --filter @reuse360/web lint
pnpm --filter @reuse360/web typecheck
pnpm --filter @reuse360/db exec prisma migrate dev
```

## Architecture

**Monorepo** managed by pnpm workspaces + Turborepo. Node >= 20, pnpm >= 9.

### Packages

| Package | Path | Purpose |
|---------|------|---------|
| `@reuse360/web` | `apps/web` | Next.js 16 frontend (App Router) |
| `@reuse360/auth` | `packages/auth` | RBAC — roles, permissions, route guards (no runtime deps) |
| `@reuse360/db` | `packages/db` | Prisma schema, migrations, seed scripts |
| worker | `apps/worker` | NestJS background jobs (Beacon AMI connector, violation detection) — scaffolded but no source yet |

### Auth & RBAC

- **Clerk** handles authentication. Roles are stored in Clerk `publicMetadata.role`.
- Three roles: `ADMIN`, `ANALYST`, `ENFORCEMENT`. Role determines both route access and action permissions.
- `packages/auth/src/permissions.ts` is the single source of truth for RBAC — defines `ROLE_ROUTES`, `ROLE_PERMISSIONS`, and `ROLE_WIDGETS`.
- Middleware (`apps/web/src/middleware.ts`) uses Clerk's `clerkMiddleware` to protect non-public routes.
- Server-side guards in `apps/web/src/lib/auth.server.ts`: `requireAuth()`, `requireRole()`, `requirePermission()`, `guardApi()`.
- Public routes (no auth): `/`, `/chat`, `/api/chat`, `/sign-in`, `/sign-up`.

### Database

- PostgreSQL 16 + PostGIS. Schema in `packages/db/prisma/schema.prisma`.
- Key models: `User`, `Parcel`, `CustomerAccount`, `MeterRead`, `Violation`, `Inspection`, `Permit`, `Complaint`, `Alert`, `LeakAlert`, `ConnectorJob`, `WateringZone`.
- Prisma client is generated into `@reuse360/db` and consumed by `@reuse360/web`.
- Local DB runs via Docker: `reuse360:reuse360dev@localhost:5432/reuse360plus`.

### Frontend Structure

- App Router with route groups: `(auth)` for sign-in/sign-up, `(dashboard)` for protected pages.
- Dashboard layout (`apps/web/src/app/(dashboard)/layout.tsx`) calls `requireAuth()` server-side — all child routes are protected.
- Dashboard sub-routes: `/admin/*`, `/analyst/*`, `/enforcement/*` — each role sees different sections.
- `@/*` path alias maps to `apps/web/src/*`.
- Styling: Tailwind CSS. Charts: Chart.js + Recharts. Maps: Leaflet/react-leaflet.

### AI Chatbot

- Public-facing water conservation assistant at `/chat` (full page) and `ChatWidget.tsx` (floating overlay).
- API route `apps/web/src/app/api/chat/route.ts` calls Anthropic SDK with a system prompt containing Pinellas County watering rules.
- Requires `ANTHROPIC_API_KEY` env var. No auth required.

### API Routes

All in `apps/web/src/app/api/`:
- `chat/` — AI chatbot (public)
- `auth/webhook/` — Clerk webhook for user sync
- `health/` — Health check
- `admin/stats/` — Admin dashboard stats
- `violations/[id]/confirm/` and `violations/[id]/create-sr/` — Violation actions
- `incidents/` — Incident data for map

### Environment

Copy `apps/web/.env.example` to `apps/web/.env.local`. Minimum required for local dev:
- `DATABASE_URL` / `DIRECT_URL` (defaults work with Docker Compose)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` (from clerk.com)
- `ANTHROPIC_API_KEY` (for AI chatbot)

### External Integrations

- **Beacon AMA API**: Smart meter data (reads, flows, leaks, endpoints)
- **Cityworks REST**: Service request creation/sync for confirmed violations
- **Pinellas eGIS**: Parcel data sync
- All configured via env vars; `CITYWORKS_TEST_MODE=true` for local dev.

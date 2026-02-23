# ReUse360 Plus

AMI-driven irrigation enforcement and reclaimed water conservation platform for Pinellas County Utilities.

## Stack

- **Frontend**: Next.js 15, Tailwind CSS, Leaflet maps
- **Auth**: Clerk (role-based: Admin / Analyst / Enforcement)
- **Database**: PostgreSQL 16 + PostGIS (Render), Prisma ORM
- **Worker**: NestJS background jobs, Beacon AMI connector
- **Integrations**: Beacon AMA API, Cityworks REST, Pinellas eGIS

---

## First Run (Local Dev)

### 1. Clone and install

```bash
git clone https://github.com/frankrobersonl-lang/ReUse360.git
cd ReUse360
pnpm install
```

### 2. Set up environment

```bash
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.local — replace all REPLACE_WITH_* values
# Minimum required for local dev:
#   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
#   CLERK_SECRET_KEY
```

### 3. Get Clerk keys

1. Go to [clerk.com](https://clerk.com) → Create account
2. Create application → name it **reuse360-plus**
3. API Keys tab → copy both keys into `.env.local`

### 4. Start database

```bash
docker compose up -d
# Postgres: localhost:5432
# pgAdmin:  localhost:5050  (admin@reuse360.local / reuse360admin)
```

### 5. Run migrations and seed

```bash
pnpm db:migrate:dev
# When prompted for migration name: type "init"
pnpm db:seed:dev
```

### 6. Start the app

```bash
pnpm dev:web
# Open http://localhost:3000
```

### 7. Assign your first Admin role

After signing in for the first time you'll land on `/onboarding`.

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Users → click your user
2. Scroll to **Public metadata** → click Edit
3. Paste: `{ "role": "ADMIN" }`
4. Save → sign out → sign back in
5. You'll be redirected to `/admin` automatically

---

## Project Structure

```
ReUse360/
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/     # sign-in, sign-up
│   │       │   ├── (dashboard)/# protected pages
│   │       │   │   ├── admin/
│   │       │   │   ├── analyst/
│   │       │   │   └── enforcement/
│   │       │   ├── api/        # Route Handlers
│   │       │   └── onboarding/
│   │       ├── components/
│   │       └── lib/
│   └── worker/                 # Background job runner
├── packages/
│   ├── auth/                   # RBAC — roles, permissions, routes
│   └── db/                     # Prisma schema + seed
└── docker-compose.yml
```

## Role Access Matrix

| Route | ADMIN | ANALYST | ENFORCEMENT |
|---|:---:|:---:|:---:|
| `/admin/*` | ✅ | ❌ | ❌ |
| `/analyst/*` | ✅ | ✅ | ❌ |
| `/enforcement/*` | ✅ | ✅* | ✅ |

*Analysts get read-only enforcement access (no permit/complaint mutations)

## Environment Variables

See `apps/web/.env.example` for all variables with instructions.

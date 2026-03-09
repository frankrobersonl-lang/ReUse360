# ReUse360 Plus — Director Demo Script

**Date:** March 2026
**Duration:** ~15 minutes
**Audience:** Director / Leadership review

---

## Pre-Demo Setup

```bash
# 1. Start local services (Postgres, Redis, pgAdmin)
docker compose up -d

# 2. Seed the database with realistic data
pnpm db:seed:dev

# 3. Start the app
pnpm dev:web
# App runs at http://localhost:3000
```

**Seed data summary:**
- 6 watering zones (SWFWMD Phase II schedules)
- 6 platform users (1 Admin, 2 Analysts, 3 Enforcement)
- 12 parcels with customer accounts across Clearwater, Largo, Seminole, St. Petersburg
- 25 violations (mixed types and statuses)
- 12 inspections, 10 permits, 8 complaints, 6 leak alerts
- 168 meter reads (14 days x 12 accounts)
- 6 connector jobs (Beacon, GIS, Cityworks)

**Demo credentials:** Sign in with the admin Clerk account (frankrobersonl@gmail.com).

---

## Act 1 — Login & Role-Based Access (2 min)

1. **Open** `http://localhost:3000` — landing page redirects to sign-in.
2. **Sign in** via Clerk (Google SSO or email/password).
3. **Point out:** Three roles exist — Admin, Analyst, Enforcement. Each role sees only their permitted routes and actions. RBAC is enforced server-side.
4. After login, you land on the **Admin Dashboard** automatically (role-based redirect).

**Talking points:**
- Clerk handles auth — no passwords stored in our DB
- Roles are assigned in Clerk metadata, enforced in middleware + server components
- Public routes (chat, health) don't require auth

---

## Act 2 — Admin Dashboard KPIs (3 min)

1. **Show the KPI grid** — three sections of cards, all pulling live data from Neon DB:

   | Card | What It Shows |
   |------|--------------|
   | Violations Today | Violations detected since midnight |
   | Violations This Week | Rolling 7-day count |
   | Active Violations | DETECTED + CONFIRMED + NOTIFIED status count |
   | Open Inspections | SCHEDULED + IN_PROGRESS inspections |
   | Leak Alerts | Unresolved continuous-flow alerts |
   | Active Permits | Approved permits not yet expired |
   | Open Complaints | OPEN + INVESTIGATING complaints |
   | Watering Zones | Active SWFWMD Phase II zones (6) |
   | Total Users | Active platform users |
   | Running Jobs | Beacon/GIS/Cityworks connector jobs in progress |

2. **Scroll to Recent Violations table** — shows the 5 most recent violations with account name, type badge, status badge, and detection date.

3. **Click into a violation** from the table to preview the detail view (covered in Act 5).

**Talking points:**
- All numbers are real-time server-side queries (no client fetch, no stale cache)
- KPI cards use color variants: green = healthy, amber = attention, red = critical
- This replaces the manual Excel tracking currently used by PCU

---

## Act 3 — Parcel / Address Lookup (2 min)

1. **Navigate** to the Enforcement Dashboard (`/enforcement/dashboard`).
2. **Use the ParcelSearch component** — type a parcel ID, address, or owner name.
3. **Try these sample lookups:**
   - Parcel ID: `123456`
   - Address: `Missouri` (partial match)
   - Owner: `Henderson`
4. **Show the result card** — displays owner info, irrigation day, water source (potable vs. reclaimed), violation history, and citation status.

**Talking points:**
- Field officers use this during patrol to quickly check any property
- Future integration: live Beacon AMI data + Pinellas eGIS parcel layer
- All lookups are logged to the database for audit trail

---

## Act 4 — Patrol Log Entry (2 min)

1. **Navigate** to `/enforcement/patrol-log`.
2. **Fill out a sample patrol shift:**
   - Select officer(s): Franklin Roberson
   - Patrol date: today
   - Shift times: 06:00 – 14:00
   - Mileage: 47
   - Violations found: 3
   - Citations issued: 1, Warnings issued: 2
   - Outreach conducted: 4
   - Water source: Potable
3. **Submit** — show the success confirmation screen.
4. **Point out** the "Log Another Shift" option for multi-officer days.

**Talking points:**
- Replaces paper-based patrol reporting
- Data feeds into KPI dashboards and weekly enforcement summaries
- Tracks officer activity for workload balancing

---

## Act 5 — Violation Workflow (3 min)

1. **Navigate** to `/enforcement/violations` — the violations list view.
2. **Show search and filters:**
   - Search by case number (e.g., `PCU-`)
   - Filter by status: DETECTED, CONFIRMED, NOTIFIED, SR_CREATED, RESOLVED, DISMISSED
   - Filter by type: WRONG_DAY, WRONG_TIME, EXCESSIVE_USAGE, etc.
3. **Click into a DETECTED violation** to open the detail page.
4. **Walk through the status progression component:**
   - DETECTED (AMI flagged) → CONFIRMED (analyst verified) → NOTIFIED (letter sent) → SR_CREATED (Cityworks) → RESOLVED
5. **Click "Confirm Violation"** — status updates to CONFIRMED with timestamp.
6. **Click "Create Service Request"** — simulates Cityworks SR creation (test mode).
7. **Show the case number** format: `PCU-2026-0001`.

**Talking points:**
- End-to-end digital workflow replaces manual tracking
- Cityworks integration creates SRs automatically (test mode for demo)
- Full audit trail: who confirmed, when, what changed
- Six violation types mapped to FAC 40D-22 ordinance codes

---

## Act 6 — AI Chatbot / RAG Demo (3 min)

1. **Navigate** to `/chat` (public page, no auth required).
2. **Point out** the Phase II water shortage alert banner at the top.
3. **Try the quick-question chips** first — click "What are my watering days?"
4. **Ask these demo questions to show RAG knowledge:**

   > "What days can I water if I live on an odd-numbered address?"

   Expected: Mon/Thu before 8 AM per SWFWMD Phase II restrictions.

   > "What happens if I get caught watering on the wrong day?"

   Expected: First offense warning, then fines escalating per FAC 40D-22.

   > "Can I water my new sod every day?"

   Expected: Yes, 30-day establishment period with a temporary waiver permit.

   > "What is reclaimed water and can I use it for irrigation?"

   Expected: Treated wastewater safe for irrigation, 7-day watering allowed, available in eligible zones.

   > "How do I report a neighbor wasting water?"

   Expected: Call PCU or use the customer portal to file a complaint.

5. **Show the floating ChatWidget** on the dashboard (bottom-right bubble) — same AI, accessible from any authenticated page.

**Talking points:**
- Public-facing — residents can ask questions 24/7 without calling PCU
- Powered by Claude with Pinellas County-specific watering rules
- RAG architecture: pgvector stores FAC 40D-22 and PCU policy documents
- Chat sessions are logged (viewable at `/admin/chat-logs`)

---

## Wrap-Up Talking Points

- **Current state:** Core enforcement workflow is operational — violations, inspections, patrol logs, permits, complaints all tracked digitally
- **Data pipeline:** Seed data demonstrates the full lifecycle; production will ingest from Beacon AMA API
- **Next steps:**
  - Beacon AMI live connector (real meter data ingestion)
  - Cityworks production integration
  - Analyst charts and trend reporting
  - Mobile-responsive field officer view
  - Email/SMS notification system for violation notices

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| KPIs all show 0 | Run `pnpm db:seed:dev` to populate data |
| Chat returns errors | Check `ANTHROPIC_API_KEY` in `.env.local` |
| Sign-in fails | Verify Clerk keys in `.env.local` |
| DB connection error | Run `docker compose up -d` first |
| Stale Prisma client | Run `pnpm db:generate` then restart dev server |

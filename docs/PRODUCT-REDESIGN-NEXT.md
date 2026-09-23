# ReUse360 Plus Product Redesign: Next Release

The first release establishes the broader product story, a modular navigation model, and a public synthetic workspace. The existing compliance and enforcement workflows remain intact.

## Priority 1: Replace synthetic workflows with shared product services

- Add first-class data models for conservation signals, customer communications, program enrollment, interaction timelines, goals, and measured outcomes.
- Create tenant-scoped APIs for segments, outreach, program eligibility, follow-up, and post-action savings.
- Generalize AMI ingestion behind a vendor-neutral adapter; keep Beacon as one supported connector.
- Add weather normalization, comparison cohorts, baseline rules, and scenario-model provenance.

## Priority 2: Complete the utility and customer experiences

- Build protected Monitor, Engage, Assist, Programs, and Measure routes using the new shared services.
- Add segment-to-campaign workflow with email, SMS, letter, and portal delivery providers.
- Add a customer portal for hourly, daily, monthly, and seasonal use; goals; bill impact; alerts; recommendations; rebate or audit requests; and action confirmation.
- Add program operations for eligibility, approval, site visits, installation, follow-up, savings, cost effectiveness, and equity analysis.

## Priority 3: Mobile and Apple distribution

The current product is a server-rendered Next.js web app with Clerk authentication. It is responsive, but it has no web manifest, service worker, offline queue, push provider, native camera or GPS integration, or installable app shell. The current patrol form also assumes a live network connection.

Recommended path:

1. Make the responsive web app installable as a PWA for low-risk office and customer workflows.
2. Add offline-safe field architecture: local encrypted drafts, queued submissions, conflict handling, upload retry, and explicit sync state.
3. Wrap the proven web app with Capacitor for iPhone and iPad. Use native plugins for APNs push, camera/photo evidence, location, secure storage, and network state while reusing the Next.js UI and APIs.
4. Validate Clerk's native redirect and session behavior, Apple privacy disclosures, permission-purpose strings, account deletion, and App Store review requirements before submission.

A separate Swift/SwiftUI rewrite is not the best second-stage investment today. Reconsider native-only screens if field testing shows that long offline patrols, background GPS, large evidence uploads, or intensive map interaction cannot meet reliability targets through the wrapper.

## Priority 4: Production readiness

- Add interaction and accessibility tests for goal switching, filters, segment selection, scenario modeling, and responsive navigation.
- Define outcome metrics and clearly separate observed results from modeled forecasts in every report.
- Add configurable content and policy packs so no region, district, AMI vendor, GIS, work-management system, or CIS is presented as mandatory.
- Run security and privacy review for customer data, message consent, retention, audit trails, and AI knowledge sources before live pilots.

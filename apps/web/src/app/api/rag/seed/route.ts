import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateEmbedding, toVectorLiteral } from '@/lib/embeddings'

export const maxDuration = 60 // allow up to 60s on Vercel

const SEED_DOCUMENTS = [
  // ── SWFWMD FAC 40D-22 Rule Excerpts ──────────────
  {
    title: 'FAC 40D-22 — Year-Round Irrigation Restrictions',
    sourceType: 'ordinance',
    content: `Florida Administrative Code Rule 40D-22.201 — Year-Round Water Conservation Measures for Pinellas County. Landscape irrigation using the public water supply, private wells, or any other water source is limited to two days per week. ODD-numbered addresses may irrigate on Wednesday and Saturday. EVEN-numbered addresses may irrigate on Thursday and Sunday. Non-residential properties may irrigate on Tuesday and Friday. Irrigation is allowed only before 8:00 AM or after 6:00 PM. Irrigation between 8:00 AM and 6:00 PM is prohibited and constitutes a violation. Exceptions: hand watering with an automatic shut-off nozzle, drip/micro-irrigation for non-lawn areas, newly installed landscaping within the first 30 days (with proof of installation), and freeze protection during declared freeze warnings.`,
  },
  {
    title: 'FAC 40D-22 — Modified Phase II Water Shortage Order',
    sourceType: 'ordinance',
    content: `SWFWMD Modified Phase II Water Shortage Order (effective through July 1, 2026). Due to a 13.6-inch rainfall deficit across the Southwest Florida Water Management District, all Pinellas County Utilities customers are limited to ONE watering day per week. North of SR-580: Even addresses water on Saturday, Odd addresses water on Wednesday. South of SR-580: Even addresses water on Tuesday, Odd addresses water on Thursday. Permitted watering hours remain 12:01 AM–8:00 AM or 6:00 PM–11:59 PM. Properties under 1 acre must choose one window per watering day. Low-volume watering of individual plants and shrubs (not lawns) using a hand-held hose with shut-off nozzle is allowed any day/time. Violations during Phase II are subject to enhanced enforcement and accelerated citation schedules.`,
  },
  {
    title: 'FAC 40D-22 — Citation and Fine Schedule',
    sourceType: 'ordinance',
    content: `Pinellas County Utilities Enforcement Citation Schedule under FAC 40D-22. First offense: Written warning delivered to the property. Second offense within 12 months: $50 civil fine. Third offense within 12 months: $150 civil fine. Fourth and subsequent offenses: $300 civil fine per occurrence. Separate citation track for PCU enforcement officers: 1st citation fee is $193.00. 2nd citation within 30 days of the first doubles to $386.00. Citations are issued per property, not per owner. Property owners may appeal citations within 30 days of issuance by filing a written appeal with the Pinellas County Utilities Water Conservation Division. Appeals are heard by the Code Enforcement Board. Failure to pay within 60 days may result in a lien on the property.`,
  },
  // ── Sample Violation Records ─────────────────────
  {
    title: 'Violation Record — 1421 Bayshore Blvd, Safety Harbor',
    sourceType: 'violation_record',
    content: `Violation ID: VIO-2026-00847. Address: 1421 Bayshore Blvd, Safety Harbor, FL 34695. Parcel ID: 123456. Account: PCU-2024-008841. Water Source: Reclaimed. Violation Type: WRONG_DAY. Detected: February 14, 2026 at 7:15 AM via Beacon AMI continuous flow alert. The property irrigated on a Monday, which is not an allowed day for even-numbered addresses (allowed: Saturday under Phase II). Status: CONFIRMED. Officer: Ian Schollenberger. Citation: Warning issued (1st offense). Follow-up inspection scheduled for March 2026. Customer contacted by mail and email on February 16, 2026.`,
  },
  {
    title: 'Violation Record — 3050 Gulf-to-Bay Blvd, Clearwater',
    sourceType: 'violation_record',
    content: `Violation ID: VIO-2026-00623. Address: 3050 Gulf-to-Bay Blvd, Clearwater, FL 33759. Parcel ID: 789012. Account: PCU-2024-014223. Water Source: Potable. Violation Type: WRONG_TIME. Detected: January 28, 2026 at 10:42 AM via AMI spike detection. The property was irrigating during prohibited hours (8:00 AM–6:00 PM). This is the 4th violation for this property within 12 months. Status: SR_CREATED. Cityworks SR: CW-2026-1847. Citation: 2nd citation issued — $386.00 fine. Prior violations: January 5, December 18, November 29. Property owner David Mitchell notified. Escalated to code enforcement.`,
  },
  {
    title: 'Violation Record — 440 4th Ave N, St. Petersburg',
    sourceType: 'violation_record',
    content: `Violation ID: VIO-2026-01102. Address: 440 4th Ave N, St. Petersburg, FL 33701. Parcel ID: 901234. Account: PCU-2024-005517. Water Source: Potable. Violation Type: EXCESSIVE_USAGE. Detected: March 1, 2026. Beacon AMI meter read showed 2,847 gallons consumed in a single 24-hour period — 4.2x the neighborhood average. Property is a single-family home with standard landscaping. No active irrigation permit on file. Status: CONFIRMED. Officer: Franklin Roberson. Citation: 1st citation — $193.00. Customer James Kowalski contacted by phone on March 3, 2026. Customer claims irrigation timer malfunction. Recommendation: schedule inspection to verify irrigation system.`,
  },
  {
    title: 'Violation Record — 2215 Drew St, Clearwater',
    sourceType: 'violation_record',
    content: `Violation ID: VIO-2025-04291. Address: 2215 Drew St, Clearwater, FL 33765. Parcel ID: 567890. Account: PCU-2024-018376. Water Source: Well/Lake. Violation Type: WRONG_DAY. Detected: December 10, 2025 at 6:45 AM via field patrol observation. The property was irrigating on a Friday, which is not an allowed day for odd-numbered addresses (allowed: Wednesday under Phase II). Note: Well water and lake water are subject to the same SWFWMD restrictions as potable and reclaimed water. Property owner Patricia Gonzalez has 3 prior violations. Status: RESOLVED. Fine: Warning issued. Customer educated about well water enforcement. Follow-up showed compliance.`,
  },
  {
    title: 'Violation Record — 7800 Ulmerton Rd, Largo (HOA)',
    sourceType: 'violation_record',
    content: `Violation ID: VIO-2025-03988. Address: 7800 Ulmerton Rd, Largo, FL 33771. Parcel ID: 345678. Account: PCU-2024-021090. Water Source: Reclaimed. Violation Type: CONTINUOUS_FLOW. Detected: November 15, 2025 via Beacon AMI leak alert — continuous flow detected for 72+ hours. Estimated water loss: 12,400 gallons. Investigation revealed a stuck irrigation valve in the common area sprinkler system. Status: RESOLVED. Sunrise Lakes HOA contacted immediately. Valve repaired on November 17, 2025. No citation issued — classified as equipment malfunction, not intentional violation. HOA advised to install flow sensors on zone valves. Leak alert cleared on November 18, 2025.`,
  },
]

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Pre-flight checks
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured. Add it to Vercel environment variables.' },
      { status: 503 },
    )
  }

  try {
    // Ensure pgvector extension is enabled
    await db.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector')

    // Ensure embedding column exists
    await db.$executeRawUnsafe(
      `DO $$ BEGIN
        ALTER TABLE rag_documents ADD COLUMN embedding vector(1536);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$`
    )

    // Check if already seeded
    const existing = await db.ragDocument.count()
    if (existing > 0) {
      return NextResponse.json({
        message: `RAG store already has ${existing} documents. Delete existing documents first to re-seed.`,
        count: existing,
      })
    }

    const results: { id: string; title: string }[] = []

    for (const doc of SEED_DOCUMENTS) {
      const embedding = await generateEmbedding(`${doc.title}: ${doc.content}`)
      const vecLiteral = toVectorLiteral(embedding)

      const record = await db.ragDocument.create({
        data: {
          title: doc.title,
          content: doc.content,
          sourceType: doc.sourceType,
          chunkIndex: 0,
        },
      })

      await db.$executeRawUnsafe(
        `UPDATE rag_documents SET embedding = $1::vector WHERE id = $2`,
        vecLiteral,
        record.id,
      )

      results.push({ id: record.id, title: doc.title })
    }

    // Create IVFFlat index if it doesn't exist (needs at least 1 row)
    try {
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx ON rag_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10)`
      )
    } catch {
      // Index creation can fail if not enough rows; cosine search still works via sequential scan
    }

    return NextResponse.json({
      message: `Seeded ${results.length} RAG documents`,
      documents: results,
    }, { status: 201 })
  } catch (error) {
    console.error('RAG seed error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Seed failed', detail: message }, { status: 500 })
  }
}

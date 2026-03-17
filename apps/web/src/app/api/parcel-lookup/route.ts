import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { queryFeatureService, ARCGIS_SERVICES } from '@/lib/gis/arcgis'

export const dynamic = 'force-dynamic'

interface ParcelResult {
  parcelId: string
  ownerName: string
  address: string
  accountNumber: string | null
  waterSource: string
  lastViolationDate: string | null
  violationCount: number
  citationStatus: string
  irrigationDay: string | null
  wateringZone: string | null
  lat: number | null
  lon: number | null
  isReclaimedEligible: boolean
}

/**
 * GET /api/parcel-lookup?q=...
 *
 * Hybrid parcel lookup: tries local DB first, falls back to ArcGIS.
 * Returns enriched parcel data with violation history from the DB.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') ?? searchParams.get('address') ?? searchParams.get('parcelId') ?? ''

  if (!query.trim()) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
  }

  const q = query.trim()
  const normalized = normalizeAddress(q)
  const isParcelId = /^[\d-]+$/.test(q) && q.length >= 5

  try {
    // ── Step 1: Search local DB (fast, enriched with violation data) ──
    const dbResults = await searchLocalDB(q, normalized)

    if (dbResults.length > 0) {
      await logLookup(userId, q, dbResults[0])
      return NextResponse.json({ results: dbResults, source: 'database' })
    }

    // ── Step 2: Fall back to ArcGIS ParcelPropertyInfo ──
    if (!isParcelId) {
      const arcgisResult = await searchArcGIS(normalized)
      if (arcgisResult) {
        await logLookup(userId, q, arcgisResult)
        return NextResponse.json({ results: [arcgisResult], source: 'arcgis' })
      }
    } else {
      const arcgisResult = await searchArcGISByParcelId(q)
      if (arcgisResult) {
        await logLookup(userId, q, arcgisResult)
        return NextResponse.json({ results: [arcgisResult], source: 'arcgis' })
      }
    }

    // ── No results from any source ──
    return NextResponse.json({
      results: [],
      message: `No parcel found for "${q}". Try searching by parcel ID or use format: 123 N STREET AVE, CITY`,
    })
  } catch (err) {
    console.error('Parcel lookup error:', err)
    // Never show "Lookup failed" — wrap as a no-result with context
    return NextResponse.json({
      results: [],
      message: `No parcel found for "${q}". Try searching by parcel ID or use format: 123 N STREET AVE, CITY`,
    })
  }
}

// ── Address normalization ─────────────────────────────────────────────

/** USPS standard suffix abbreviations */
const SUFFIX_MAP: Record<string, string> = {
  AVENUE: 'AVE', AV: 'AVE',
  STREET: 'ST',
  BOULEVARD: 'BLVD',
  DRIVE: 'DR',
  ROAD: 'RD',
  LANE: 'LN',
  COURT: 'CT',
  CIRCLE: 'CIR',
  PLACE: 'PL',
  TERRACE: 'TER',
  HIGHWAY: 'HWY',
  PARKWAY: 'PKWY',
  WAY: 'WAY',
}

/**
 * Normalize an address for ArcGIS SITE_ADDRESS matching:
 * - ALL CAPS (ArcGIS stores uppercase)
 * - Strip city/state/zip after comma
 * - Normalize street suffixes to USPS standard
 * - Remove APT/UNIT/STE numbers
 * - Collapse extra whitespace
 */
function normalizeAddress(raw: string): string {
  let addr = raw.toUpperCase().replace(/\s+/g, ' ').trim()

  // Strip city, state, zip after comma
  addr = addr.replace(/,\s*.+$/, '').trim()

  // Remove apartment/unit/suite numbers
  addr = addr.replace(/\s+(#|APT|UNIT|STE|SUITE|BLDG|BUILDING)\s*\S*$/i, '').trim()

  // Normalize suffixes
  for (const [full, abbr] of Object.entries(SUFFIX_MAP)) {
    addr = addr.replace(new RegExp(`\\b${full}\\b`, 'g'), abbr)
  }

  return addr.replace(/\s+/g, ' ').trim()
}

/**
 * Parse a normalized address into components for ArcGIS field-level queries.
 * E.g. "100 S MISSOURI AVE" → { num: "100", pfx: "S", name: "MISSOURI", sfx: "AVE" }
 */
function parseAddress(normalized: string): {
  num: string | null
  pfx: string | null
  name: string | null
  sfx: string | null
} {
  const parts = normalized.split(' ')
  if (parts.length < 2) return { num: null, pfx: null, name: null, sfx: null }

  let idx = 0
  // First token: house number (digits, possibly with suffix like "100A")
  const num = /^\d/.test(parts[0]) ? parts[idx++] : null

  // Directional prefix
  const DIRS = new Set(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'])
  const pfx = idx < parts.length && DIRS.has(parts[idx]) ? parts[idx++] : null

  // Known suffixes
  const SUFFIXES = new Set(Object.values(SUFFIX_MAP))

  // Street name: everything between prefix and suffix
  const nameTokens: string[] = []
  while (idx < parts.length) {
    if (SUFFIXES.has(parts[idx]) && idx > (num ? 1 : 0)) break
    nameTokens.push(parts[idx++])
  }

  const sfx = idx < parts.length && SUFFIXES.has(parts[idx]) ? parts[idx] : null
  const name = nameTokens.length > 0 ? nameTokens.join(' ') : null

  return { num, pfx, name, sfx }
}

// ── Local DB search ────────────────────────────────────────────────────

async function searchLocalDB(raw: string, normalized: string): Promise<ParcelResult[]> {
  // Try exact parcel ID match first
  const parcel = await db.parcel.findUnique({
    where: { parcelId: raw },
    include: {
      customerAccounts: {
        where: { isActive: true },
        take: 1,
        include: {
          violations: {
            where: { status: { not: 'DISMISSED' } },
            orderBy: { detectedAt: 'desc' },
            take: 1,
            select: { detectedAt: true },
          },
          _count: { select: { violations: true } },
        },
      },
    },
  })
  if (parcel) return [mapParcelToResult(parcel)]

  // Try address search with both raw and normalized forms
  const parcels = await db.parcel.findMany({
    where: {
      OR: [
        { siteAddress: { contains: raw, mode: 'insensitive' } },
        { siteAddress: { contains: normalized, mode: 'insensitive' } },
      ],
    },
    take: 10,
    include: {
      customerAccounts: {
        where: { isActive: true },
        take: 1,
        include: {
          violations: {
            where: { status: { not: 'DISMISSED' } },
            orderBy: { detectedAt: 'desc' },
            take: 1,
            select: { detectedAt: true },
          },
          _count: { select: { violations: true } },
        },
      },
    },
  })
  if (parcels.length > 0) return parcels.map(mapParcelToResult)

  // Try account number / name search
  const accounts = await db.customerAccount.findMany({
    where: {
      OR: [
        { accountId: { contains: raw, mode: 'insensitive' } },
        { firstName: { contains: raw, mode: 'insensitive' } },
        { lastName: { contains: raw, mode: 'insensitive' } },
        { serviceAddress: { contains: normalized, mode: 'insensitive' } },
      ],
      isActive: true,
    },
    take: 10,
    include: {
      parcel: true,
      violations: {
        where: { status: { not: 'DISMISSED' } },
        orderBy: { detectedAt: 'desc' },
        take: 1,
        select: { detectedAt: true },
      },
      _count: { select: { violations: true } },
    },
  })

  return accounts
    .filter((a) => a.parcel)
    .map((a) => ({
      parcelId: a.parcel!.parcelId,
      ownerName: [a.firstName, a.lastName].filter(Boolean).join(' ') || 'Unknown',
      address: a.serviceAddress,
      accountNumber: a.accountId,
      waterSource: a.isReclaimed ? 'Reclaimed' : 'Potable',
      lastViolationDate: a.violations[0]?.detectedAt?.toISOString().split('T')[0] ?? null,
      violationCount: a._count.violations,
      citationStatus: getCitationStatus(a._count.violations),
      irrigationDay: a.parcel!.irrigationDay,
      wateringZone: a.parcel!.wateringZone,
      lat: a.parcel!.lat ? Number(a.parcel!.lat) : null,
      lon: a.parcel!.lon ? Number(a.parcel!.lon) : null,
      isReclaimedEligible: a.parcel!.isReclaimedEligible,
    }))
}

// ── ArcGIS search ──────────────────────────────────────────────────────

/**
 * Pinellas_ParcelPropertyInfo actual field names:
 *   PARCELID, SITE_ADDRESS, OWNER1, OWNER2,
 *   STR_NUM, STR_PFX, STR_NAME, STR_SFX, STR_SFX_DIR, STR_UNIT,
 *   STR_CITY, STR_ZIP
 */
const PARCEL_FIELDS = 'PARCELID,SITE_ADDRESS,OWNER1,STR_NUM,STR_PFX,STR_NAME,STR_SFX,STR_CITY,STR_ZIP'

async function searchArcGIS(normalized: string): Promise<ParcelResult | null> {
  const parsed = parseAddress(normalized)

  // ── Strategy A: exact match on SITE_ADDRESS ──
  const escaped = normalized.replace(/'/g, "''")
  const exactResult = await queryParcels(
    `SITE_ADDRESS = '${escaped}'`,
    1,
  )
  if (exactResult) return exactResult

  // ── Strategy B: component field match (STR_NUM + STR_NAME) ──
  if (parsed.num && parsed.name) {
    const clauses = [`STR_NUM = '${parsed.num}'`]
    if (parsed.pfx) clauses.push(`STR_PFX = '${parsed.pfx}'`)
    clauses.push(`STR_NAME = '${parsed.name.replace(/'/g, "''")}'`)
    if (parsed.sfx) clauses.push(`STR_SFX = '${parsed.sfx}'`)

    const compResult = await queryParcels(clauses.join(' AND '), 1)
    if (compResult) return compResult
  }

  // ── Strategy C: LIKE on SITE_ADDRESS with just the street name ──
  if (parsed.name) {
    const nameEscaped = parsed.name.replace(/'/g, "''")
    const likeResult = await queryParcels(
      `UPPER(SITE_ADDRESS) LIKE '%${nameEscaped}%'`,
      5,
    )
    if (likeResult) return likeResult
  }

  // ── Strategy D: LIKE with the full normalized string ──
  const fullLike = await queryParcels(
    `UPPER(SITE_ADDRESS) LIKE '%${escaped}%'`,
    1,
  )
  if (fullLike) return fullLike

  return null
}

async function searchArcGISByParcelId(id: string): Promise<ParcelResult | null> {
  const escaped = id.replace(/'/g, "''")
  return queryParcels(`PARCELID = '${escaped}'`, 1)
}

/**
 * Execute a single ArcGIS query against ParcelPropertyInfo and map the
 * first result to a ParcelResult. Returns null if no features.
 */
async function queryParcels(where: string, limit: number): Promise<ParcelResult | null> {
  try {
    const result = await queryFeatureService(ARCGIS_SERVICES.parcels, {
      where,
      outFields: PARCEL_FIELDS,
      returnGeometry: true,
      resultRecordCount: limit,
    })

    if (result.features.length === 0) return null
    return mapArcGISFeature(result.features[0])
  } catch (err) {
    console.warn(`[parcel-lookup] ArcGIS query failed for where="${where}":`, err instanceof Error ? err.message : err)
    return null
  }
}

// ── ArcGIS → ParcelResult mapping ──────────────────────────────────────

function mapArcGISFeature(feature: { attributes: Record<string, unknown>; geometry?: unknown }): ParcelResult {
  const a = feature.attributes

  // Build address from SITE_ADDRESS or component fields
  const siteAddr = a.SITE_ADDRESS as string | null
  const address = siteAddr
    ?? ([a.STR_NUM, a.STR_PFX, a.STR_NAME, a.STR_SFX].filter(Boolean).join(' ') || 'Unknown')

  // Compute centroid from polygon rings geometry
  const { lat, lon } = centroidFromRings(feature.geometry)

  return {
    parcelId: String(a.PARCELID ?? ''),
    ownerName: String(a.OWNER1 ?? 'Unknown'),
    address,
    accountNumber: null,
    waterSource: 'Unknown',
    lastViolationDate: null,
    violationCount: 0,
    citationStatus: 'No Citations',
    irrigationDay: null,
    wateringZone: null,
    lat,
    lon,
    isReclaimedEligible: false,
  }
}

/**
 * Compute the centroid of ArcGIS ring geometry (polygon).
 * ParcelPropertyInfo returns rings, not points.
 */
function centroidFromRings(geometry: unknown): { lat: number | null; lon: number | null } {
  const geom = geometry as { rings?: number[][][]; x?: number; y?: number } | null
  if (!geom) return { lat: null, lon: null }

  // Point geometry (shouldn't happen for parcels, but handle it)
  if (geom.x != null && geom.y != null) return { lat: geom.y, lon: geom.x }

  // Ring geometry → average all vertices of the first ring
  if (geom.rings && geom.rings.length > 0) {
    const ring = geom.rings[0]
    if (ring.length === 0) return { lat: null, lon: null }
    let sumX = 0, sumY = 0
    for (const [x, y] of ring) {
      sumX += x
      sumY += y
    }
    return {
      lat: sumY / ring.length,
      lon: sumX / ring.length,
    }
  }

  return { lat: null, lon: null }
}

// ── Parcel → result mapping ────────────────────────────────────────────

function mapParcelToResult(parcel: {
  parcelId: string;
  siteAddress: string | null;
  irrigationDay: string | null;
  wateringZone: string | null;
  lat: { toNumber?: () => number } | number | null;
  lon: { toNumber?: () => number } | number | null;
  isReclaimedEligible: boolean;
  customerAccounts?: {
    firstName: string | null;
    lastName: string | null;
    serviceAddress: string;
    accountId: string;
    isReclaimed: boolean;
    violations: { detectedAt: Date }[];
    _count: { violations: number };
  }[];
}): ParcelResult {
  const account = parcel.customerAccounts?.[0]
  const violationCount = account?._count?.violations ?? 0
  const lastViolation = account?.violations?.[0]

  return {
    parcelId: parcel.parcelId,
    ownerName: account
      ? [account.firstName, account.lastName].filter(Boolean).join(' ') || 'Unknown'
      : 'Unknown',
    address: account?.serviceAddress ?? parcel.siteAddress ?? '',
    accountNumber: account?.accountId ?? null,
    waterSource: account?.isReclaimed ? 'Reclaimed' : 'Potable',
    lastViolationDate: lastViolation?.detectedAt?.toISOString().split('T')[0] ?? null,
    violationCount,
    citationStatus: getCitationStatus(violationCount),
    irrigationDay: parcel.irrigationDay ?? null,
    wateringZone: parcel.wateringZone ?? null,
    lat: parcel.lat ? Number(parcel.lat) : null,
    lon: parcel.lon ? Number(parcel.lon) : null,
    isReclaimedEligible: parcel.isReclaimedEligible ?? false,
  }
}

function getCitationStatus(count: number): string {
  if (count === 0) return 'No Citations'
  if (count === 1) return '1st Citation — $193.00'
  if (count === 2) return '2nd Citation — $386.00'
  return `${count} Citations — $579.00`
}

async function logLookup(userId: string, query: string, result: ParcelResult) {
  try {
    await db.parcelLookup.create({
      data: {
        officerId: userId,
        query,
        resultData: JSON.stringify(result),
      },
    })
  } catch {
    // Non-critical — don't fail the request
  }
}

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lookupParcel, searchParcels } from '@/lib/gis/arcgis'

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

  try {
    // Step 1: Search local DB (fast, enriched with violation data)
    const dbResults = await searchLocalDB(q)

    if (dbResults.length > 0) {
      await logLookup(userId, q, dbResults[0])
      return NextResponse.json({ results: dbResults, source: 'database' })
    }

    // Step 2: Fall back to ArcGIS ParcelPropertyInfo
    const arcgisResult = await searchArcGIS(q)

    if (arcgisResult) {
      await logLookup(userId, q, arcgisResult)
      return NextResponse.json({ results: [arcgisResult], source: 'arcgis' })
    }

    return NextResponse.json({ results: [], message: 'No matching parcel found' })
  } catch (err) {
    console.error('Parcel lookup error:', err)
    return NextResponse.json(
      { error: 'Lookup failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

async function searchLocalDB(q: string): Promise<ParcelResult[]> {
  // Try exact parcel ID match first
  const parcel = await db.parcel.findUnique({
    where: { parcelId: q },
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

  // Try address search
  const parcels = await db.parcel.findMany({
    where: {
      OR: [
        { siteAddress: { contains: q, mode: 'insensitive' } },
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

  // Try account number search
  const accounts = await db.customerAccount.findMany({
    where: {
      OR: [
        { accountId: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
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

async function searchArcGIS(q: string): Promise<ParcelResult | null> {
  // Detect if it's a parcel ID pattern (digits and hyphens)
  const isParcelId = /^[\d-]+$/.test(q) && q.length >= 5

  const feature = isParcelId
    ? await lookupParcel({ parcelId: q })
    : await lookupParcel({ address: q })

  if (!feature) {
    // Try multi-result search for addresses
    if (!isParcelId) {
      const features = await searchParcels(q, 1)
      if (features.length > 0) return mapArcGISFeature(features[0])
    }
    return null
  }

  return mapArcGISFeature(feature)
}

function mapArcGISFeature(feature: { attributes: Record<string, unknown>; geometry?: unknown }): ParcelResult {
  const a = feature.attributes
  const geom = feature.geometry as { x?: number; y?: number } | null
  return {
    parcelId: String(a.PARCELID ?? a.ParcelID ?? a.parcelId ?? ''),
    ownerName: String(a.OWN_NAME ?? a.OWNER ?? a.OwnerName ?? 'Unknown'),
    address: String(a.SITEADDR ?? a.SiteAddr ?? a.siteAddress ?? ''),
    accountNumber: null,
    waterSource: 'Unknown',
    lastViolationDate: null,
    violationCount: 0,
    citationStatus: 'No Citations',
    irrigationDay: null,
    wateringZone: null,
    lat: geom?.y ?? null,
    lon: geom?.x ?? null,
    isReclaimedEligible: false,
  }
}

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

import { guardApi } from '@/lib/auth.server'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

/**
 * GET /api/violations — list with optional filters
 * Query params: status, type, search (address or case number), limit, offset
 */
export async function GET(req: NextRequest) {
  const guard = await guardApi('violations:read')
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const search = searchParams.get('search')?.trim()
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const where: Record<string, unknown> = {}

  if (status) {
    where.status = status
  } else {
    where.status = { not: 'DISMISSED' }
  }

  if (type) where.violationType = type

  if (search) {
    // Search by case number or address (via account relation)
    where.OR = [
      { caseNumber: { contains: search, mode: 'insensitive' } },
      { account: { serviceAddress: { contains: search, mode: 'insensitive' } } },
      { parcelId: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [violations, total] = await Promise.all([
    db.violation.findMany({
      take: limit,
      skip: offset,
      orderBy: { detectedAt: 'desc' },
      where: where as any,
      include: {
        account: {
          select: { serviceAddress: true, firstName: true, lastName: true, accountId: true },
        },
      },
    }),
    db.violation.count({ where: where as any }),
  ])

  return Response.json({ violations, total })
}

/**
 * POST /api/violations — create a new violation with auto-generated case number
 */
export async function POST(req: NextRequest) {
  const guard = await guardApi('violations:confirm')
  if (!guard.ok) return guard.response

  const body = await req.json()
  const {
    parcelId, accountId, meterId, violationType,
    wateringDay, wateringZone, ordinanceRef, notes,
    readValue,
  } = body

  if (!parcelId || !accountId || !meterId || !violationType) {
    return Response.json(
      { error: 'parcelId, accountId, meterId, and violationType are required' },
      { status: 400 },
    )
  }

  // Generate case number: PCU-YYYY-XXXX
  const year = new Date().getFullYear()
  const lastCase = await db.violation.findFirst({
    where: { caseNumber: { startsWith: `PCU-${year}-` } },
    orderBy: { caseNumber: 'desc' },
    select: { caseNumber: true },
  })

  let seq = 1
  if (lastCase?.caseNumber) {
    const lastSeq = parseInt(lastCase.caseNumber.split('-')[2])
    if (!isNaN(lastSeq)) seq = lastSeq + 1
  }
  const caseNumber = `PCU-${year}-${String(seq).padStart(4, '0')}`

  const violation = await db.violation.create({
    data: {
      caseNumber,
      parcelId,
      accountId,
      meterId,
      violationType,
      status: 'DETECTED',
      detectedAt: new Date(),
      readValue: readValue ?? 0,
      wateringDay: wateringDay ?? null,
      wateringZone: wateringZone ?? null,
      ordinanceRef: ordinanceRef ?? 'FAC 40D-22',
      notes: notes ?? null,
    },
    include: {
      account: {
        select: { serviceAddress: true, firstName: true, lastName: true },
      },
    },
  })

  return Response.json(violation, { status: 201 })
}

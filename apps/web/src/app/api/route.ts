import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@reuse360/db'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const [logs, total] = await Promise.all([
    db.patrolLog.findMany({ orderBy: { patrolDate: 'desc' }, take: limit, skip: offset }),
    db.patrolLog.count(),
  ])
  return NextResponse.json({ logs, total })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const log = await db.patrolLog.create({
    data: {
      officerNames: body.officerNames ?? [],
      patrolDate: new Date(body.patrolDate),
      mileage: body.mileage ?? 0,
      numberOfViolations: body.numberOfViolations ?? 0,
      citationsIssued: body.citationsIssued ?? 0,
      warningsIssued: body.warningsIssued ?? 0,
      violationOccurred: body.violationOccurred ?? false,
      outreachConducted: body.outreachConducted ?? false,
      waterSource: body.waterSource ?? null,
      notes: body.notes ?? null,
      shiftStart: body.shiftStart ?? null,
      shiftEnd: body.shiftEnd ?? null,
      submittedById: userId,
    },
  })
  return NextResponse.json(log, { status: 201 })
}
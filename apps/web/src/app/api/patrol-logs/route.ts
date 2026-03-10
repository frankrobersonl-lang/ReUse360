import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(url.get('limit') ?? '100'), 500);
  const offset = parseInt(url.get('offset') ?? '0');
  const startDate = url.get('startDate');
  const endDate = url.get('endDate');
  const officer = url.get('officer');

  const where: Record<string, unknown> = {};
  if (startDate || endDate) {
    where.patrolDate = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate + 'T23:59:59.999Z') }),
    };
  }
  if (officer) {
    where.officerNames = { has: officer };
  }

  const [logs, total, agg] = await Promise.all([
    db.patrolLog.findMany({
      where: where as any,
      orderBy: { patrolDate: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.patrolLog.count({ where: where as any }),
    db.patrolLog.aggregate({
      where: where as any,
      _sum: {
        mileage: true,
        numberOfViolations: true,
        citationsIssued: true,
        warningsIssued: true,
      },
    }),
  ]);

  return NextResponse.json({
    logs,
    total,
    stats: {
      totalRecords: total,
      totalMiles: agg._sum.mileage ?? 0,
      totalViolations: agg._sum.numberOfViolations ?? 0,
      totalCitations: agg._sum.citationsIssued ?? 0,
      totalWarnings: agg._sum.warningsIssued ?? 0,
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();

  const mileage = Math.max(0, Number(body.mileage) || 0);
  const numberOfViolations = Math.max(0, Math.floor(Number(body.numberOfViolations) || 0));
  const citationsIssued = Math.max(0, Math.floor(Number(body.citationsIssued) || 0));
  const warningsIssued = Math.max(0, Math.floor(Number(body.warningsIssued) || 0));

  const log = await db.patrolLog.create({
    data: {
      officerNames: body.officerNames ?? [],
      patrolDate: new Date(body.patrolDate),
      mileage,
      numberOfViolations,
      citationsIssued,
      warningsIssued,
      violationOccurred: body.violationOccurred ?? false,
      outreachConducted: body.outreachConducted ?? false,
      waterSource: body.waterSource ?? null,
      notes: body.notes ?? null,
      shiftStart: body.shiftStart ?? null,
      shiftEnd: body.shiftEnd ?? null,
      submittedById: userId,
    },
  });
  return NextResponse.json(log, { status: 201 });
}

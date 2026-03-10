import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  // ADMIN-only export
  const guard = await guardApi('reports:export');
  if (!guard.ok) return guard.response;

  const url = req.nextUrl.searchParams;
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

  const logs = await db.patrolLog.findMany({
    where: where as any,
    orderBy: { patrolDate: 'desc' },
    take: 5000,
  });

  // Build CSV
  const header = 'Case Date,Officer Name,Shift Start,Shift End,Miles Driven,Violations Observed,Citations Issued,Warnings Issued,Water Source,Notes';

  const rows = logs.map((log) => {
    const date = new Date(log.patrolDate).toLocaleDateString('en-US');
    const officers = log.officerNames.join('; ');
    const notes = (log.notes ?? '').replace(/"/g, '""');
    return [
      date,
      `"${officers}"`,
      log.shiftStart ?? '',
      log.shiftEnd ?? '',
      log.mileage,
      log.numberOfViolations,
      log.citationsIssued,
      log.warningsIssued,
      log.waterSource ?? '',
      `"${notes}"`,
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');

  const filename = `patrol-logs-${startDate ?? 'all'}-to-${endDate ?? 'all'}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

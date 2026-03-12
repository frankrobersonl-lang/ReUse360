import { type NextRequest } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const guard = await guardApi('analytics:read');
  if (!guard.ok) return guard.response;

  const { searchParams } = req.nextUrl;
  const type = searchParams.get('type');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!type || !startDate || !endDate) {
    return Response.json(
      { error: 'type, startDate, and endDate are required' },
      { status: 400 },
    );
  }

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return Response.json({ error: 'Invalid date format' }, { status: 400 });
  }

  switch (type) {
    case 'violations':
      return Response.json(await violationSummary(start, end));
    case 'patrol':
      return Response.json(await patrolActivity(start, end));
    case 'reclaimed':
      return Response.json(await reclaimedAdoption(start, end));
    case 'compliance':
      return Response.json(await complianceRate(start, end));
    default:
      return Response.json({ error: 'Invalid report type' }, { status: 400 });
  }
}

/* ── Violation Summary ──────────────────────── */

async function violationSummary(start: Date, end: Date) {
  const violations = await db.violation.findMany({
    where: { detectedAt: { gte: start, lte: end } },
    select: { violationType: true, status: true, wateringZone: true, detectedAt: true },
  });

  // By type
  const byType: Record<string, number> = {};
  // By status
  const byStatus: Record<string, number> = {};
  // By zone
  const byZone: Record<string, number> = {};
  // By week
  const byWeek: Record<string, number> = {};

  for (const v of violations) {
    const typeLabel = v.violationType.replace(/_/g, ' ');
    byType[typeLabel] = (byType[typeLabel] ?? 0) + 1;

    byStatus[v.status] = (byStatus[v.status] ?? 0) + 1;

    const zone = v.wateringZone ?? 'Unknown';
    byZone[zone] = (byZone[zone] ?? 0) + 1;

    const weekStart = getWeekStart(v.detectedAt);
    byWeek[weekStart] = (byWeek[weekStart] ?? 0) + 1;
  }

  return {
    total: violations.length,
    byType: toChartArray(byType, 'type', 'count'),
    byStatus: toChartArray(byStatus, 'status', 'count'),
    byZone: toChartArray(byZone, 'zone', 'count'),
    trend: Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count })),
  };
}

/* ── Patrol Activity ────────────────────────── */

async function patrolActivity(start: Date, end: Date) {
  const logs = await db.patrolLog.findMany({
    where: { patrolDate: { gte: start, lte: end } },
    orderBy: { patrolDate: 'asc' },
  });

  // By officer
  const byOfficer: Record<string, { patrols: number; violations: number; citations: number; warnings: number }> = {};
  // By date
  const byDate: Record<string, { patrols: number; violations: number; citations: number }> = {};

  let totalMileage = 0;
  let totalViolations = 0;
  let totalCitations = 0;
  let totalWarnings = 0;

  for (const log of logs) {
    totalMileage += log.mileage;
    totalViolations += log.numberOfViolations;
    totalCitations += log.citationsIssued;
    totalWarnings += log.warningsIssued;

    for (const officer of log.officerNames) {
      if (!byOfficer[officer]) byOfficer[officer] = { patrols: 0, violations: 0, citations: 0, warnings: 0 };
      byOfficer[officer].patrols += 1;
      byOfficer[officer].violations += log.numberOfViolations;
      byOfficer[officer].citations += log.citationsIssued;
      byOfficer[officer].warnings += log.warningsIssued;
    }

    const dateKey = log.patrolDate.toISOString().slice(0, 10);
    if (!byDate[dateKey]) byDate[dateKey] = { patrols: 0, violations: 0, citations: 0 };
    byDate[dateKey].patrols += 1;
    byDate[dateKey].violations += log.numberOfViolations;
    byDate[dateKey].citations += log.citationsIssued;
  }

  return {
    totalPatrols: logs.length,
    totalMileage: Math.round(totalMileage * 10) / 10,
    totalViolations,
    totalCitations,
    totalWarnings,
    byOfficer: Object.entries(byOfficer).map(([officer, stats]) => ({ officer, ...stats })),
    trend: Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({ date, ...stats })),
  };
}

/* ── Reclaimed Water Adoption ───────────────── */

async function reclaimedAdoption(start: Date, end: Date) {
  const [totalAccounts, reclaimedAccounts, potableAccounts, activeReclaimed] =
    await Promise.all([
      db.customerAccount.count({ where: { isActive: true } }),
      db.customerAccount.count({ where: { isActive: true, isReclaimed: true } }),
      db.customerAccount.count({ where: { isActive: true, isReclaimed: false } }),
      db.customerAccount.findMany({
        where: { isActive: true, isReclaimed: true },
        select: {
          accountId: true,
          firstName: true,
          lastName: true,
          reclaimedGallonsBaseline: true,
          reclaimedGallonsCurrent: true,
          createdAt: true,
        },
      }),
    ]);

  // Group new reclaimed accounts by month within range
  const byMonth: Record<string, number> = {};
  for (const acct of activeReclaimed) {
    if (acct.createdAt >= start && acct.createdAt <= end) {
      const monthKey = acct.createdAt.toISOString().slice(0, 7);
      byMonth[monthKey] = (byMonth[monthKey] ?? 0) + 1;
    }
  }

  const adoptionRate = totalAccounts > 0
    ? Math.round((reclaimedAccounts / totalAccounts) * 1000) / 10
    : 0;

  return {
    totalAccounts,
    reclaimedAccounts,
    potableAccounts,
    adoptionRate,
    split: [
      { name: 'Reclaimed', value: reclaimedAccounts },
      { name: 'Potable', value: potableAccounts },
    ],
    conversionTrend: Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, conversions: count })),
  };
}

/* ── Compliance Rate ────────────────────────── */

async function complianceRate(start: Date, end: Date) {
  const totalActive = await db.customerAccount.count({ where: { isActive: true } });

  // Accounts with open violations in the date range
  const accountsWithViolations = await db.violation.findMany({
    where: {
      detectedAt: { gte: start, lte: end },
      status: { not: 'DISMISSED' },
    },
    select: { accountId: true, status: true },
  });

  const violationAccountIds = new Set<string>();
  const warningAccountIds = new Set<string>();
  const activeViolationAccountIds = new Set<string>();

  for (const v of accountsWithViolations) {
    violationAccountIds.add(v.accountId);
    if (['DETECTED', 'CONFIRMED'].includes(v.status)) {
      warningAccountIds.add(v.accountId);
    }
    if (['NOTIFIED', 'SR_CREATED'].includes(v.status)) {
      activeViolationAccountIds.add(v.accountId);
    }
  }

  const compliantCount = totalActive - violationAccountIds.size;
  const compliancePercent = totalActive > 0
    ? Math.round((compliantCount / totalActive) * 1000) / 10
    : 100;

  // Weekly compliance trend
  const violations = await db.violation.findMany({
    where: { detectedAt: { gte: start, lte: end }, status: { not: 'DISMISSED' } },
    select: { detectedAt: true },
  });

  const weeklyViolations: Record<string, number> = {};
  for (const v of violations) {
    const weekStart = getWeekStart(v.detectedAt);
    weeklyViolations[weekStart] = (weeklyViolations[weekStart] ?? 0) + 1;
  }

  const trend = Object.entries(weeklyViolations)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, violationCount]) => ({
      week,
      complianceRate: totalActive > 0
        ? Math.round(((totalActive - violationCount) / totalActive) * 1000) / 10
        : 100,
      violations: violationCount,
    }));

  return {
    totalActive,
    compliantCount,
    warningCount: warningAccountIds.size,
    violationCount: activeViolationAccountIds.size,
    compliancePercent,
    breakdown: [
      { name: 'Compliant', value: compliantCount },
      { name: 'Warning', value: warningAccountIds.size },
      { name: 'Violation', value: activeViolationAccountIds.size },
    ],
    trend,
  };
}

/* ── Helpers ─────────────────────────────────── */

function getWeekStart(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return date.toISOString().slice(0, 10);
}

function toChartArray(
  record: Record<string, number>,
  keyName: string,
  valueName: string,
) {
  return Object.entries(record)
    .sort(([, a], [, b]) => b - a)
    .map(([key, value]) => ({ [keyName]: key, [valueName]: value }));
}

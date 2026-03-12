import { type NextRequest } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import db from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardApi('analytics:read');
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const account = await db.customerAccount.findUnique({
    where: { id },
    include: {
      parcel: true,
      violations: { orderBy: { detectedAt: 'desc' }, take: 50 },
      incentives: { orderBy: { appliedAt: 'desc' }, take: 50 },
      _count: { select: { violations: true, incentives: true } },
    },
  });

  if (!account) {
    return Response.json({ error: 'Account not found' }, { status: 404 });
  }

  // Inspections linked by accountId
  const inspections = await db.inspection.findMany({
    where: { accountId: account.accountId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Patrol logs (not account-specific — show recent)
  const patrolLogs = await db.patrolLog.findMany({
    orderBy: { patrolDate: 'desc' },
    take: 20,
  });

  const openViolations = account.violations.filter(
    (v) => !['RESOLVED', 'DISMISSED'].includes(v.status),
  );

  return Response.json({
    ...account,
    inspections,
    patrolLogs,
    stats: {
      totalViolations: account._count.violations,
      openCases: openViolations.length,
      inspectionsCompleted: inspections.filter((i) => i.status === 'COMPLETE').length,
      incentivesApplied: account._count.incentives,
    },
  });
}

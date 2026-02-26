import { guardApi } from '@/lib/auth.server';
import db from '@/lib/db';

export async function GET() {
  const guard = await guardApi('users:read');
  if (!guard.ok) return guard.response;

  const [
    totalUsers,
    activeViolations,
    openInspections,
    leakAlerts,
    activePermits,
    openComplaints,
    runningJobs,
    wateringZones,
  ] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.violation.count({ where: { status: { in: ['DETECTED', 'CONFIRMED', 'NOTIFIED'] } } }),
    db.inspection.count({ where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } } }),
    db.leakAlert.count({ where: { resolvedAt: null } }),
    db.permit.count({ where: { status: 'APPROVED', expiresAt: { gt: new Date() } } }),
    db.complaint.count({ where: { status: { in: ['OPEN', 'INVESTIGATING'] } } }),
    db.connectorJob.count({ where: { status: { in: ['QUEUED', 'RUNNING'] } } }),
    db.wateringZone.count({ where: { isActive: true } }),
  ]);

  const violationsToday = await db.violation.count({
    where: { detectedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
  });

  const violationsThisWeek = await db.violation.count({
    where: { detectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });

  const recentViolations = await db.violation.findMany({
    take: 10,
    orderBy: { detectedAt: 'desc' },
    include: { account: true },
  });

  return Response.json({
    totalUsers,
    activeViolations,
    openInspections,
    leakAlerts,
    activePermits,
    openComplaints,
    runningJobs,
    wateringZones,
    violationsToday,
    violationsThisWeek,
    recentViolations,
  });
}

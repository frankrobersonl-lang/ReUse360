import { type NextRequest } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const guard = await guardApi('analytics:read');
  if (!guard.ok) return guard.response;

  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q')?.trim() ?? '';

  const where = q
    ? {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' as const } },
          { lastName: { contains: q, mode: 'insensitive' as const } },
          { serviceAddress: { contains: q, mode: 'insensitive' as const } },
          { accountId: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const accounts = await db.customerAccount.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: {
      violations: { select: { id: true, status: true } },
      _count: { select: { violations: true, incentives: true } },
    },
  });

  // Derive compliance status per account
  const data = accounts.map((a) => {
    const openViolations = a.violations.filter(
      (v) => !['RESOLVED', 'DISMISSED'].includes(v.status),
    );
    const complianceStatus =
      openViolations.length > 0
        ? 'VIOLATION'
        : a._count.violations > 0
          ? 'WARNING'
          : 'COMPLIANT';

    return {
      id: a.id,
      accountId: a.accountId,
      firstName: a.firstName,
      lastName: a.lastName,
      serviceAddress: a.serviceAddress,
      isReclaimed: a.isReclaimed,
      isActive: a.isActive,
      complianceStatus,
      violationCount: a._count.violations,
      incentiveCount: a._count.incentives,
    };
  });

  return Response.json(data);
}

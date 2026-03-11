import { guardApi } from '@/lib/auth.server';
import { db } from '@/lib/db';

export async function GET() {
  const guard = await guardApi('incentives:read');
  if (!guard.ok) return guard.response;

  const [total, pending, approved, paid, denied, byType] = await Promise.all([
    db.reclaimedIncentive.count(),
    db.reclaimedIncentive.count({ where: { status: 'PENDING' } }),
    db.reclaimedIncentive.count({ where: { status: 'APPROVED' } }),
    db.reclaimedIncentive.count({ where: { status: 'PAID' } }),
    db.reclaimedIncentive.count({ where: { status: 'DENIED' } }),
    db.reclaimedIncentive.groupBy({
      by: ['type'],
      _count: true,
      _sum: { amount: true },
    }),
  ]);

  const totalPaidAmount = await db.reclaimedIncentive.aggregate({
    where: { status: 'PAID' },
    _sum: { amount: true },
  });

  const totalApprovedAmount = await db.reclaimedIncentive.aggregate({
    where: { status: { in: ['APPROVED', 'PAID'] } },
    _sum: { amount: true },
  });

  return Response.json({
    total,
    pending,
    approved,
    paid,
    denied,
    totalPaidAmount: totalPaidAmount._sum.amount ?? 0,
    totalApprovedAmount: totalApprovedAmount._sum.amount ?? 0,
    byType: byType.map((t) => ({
      type: t.type,
      count: t._count,
      totalAmount: t._sum.amount ?? 0,
    })),
  });
}

import { NextRequest } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import { db } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardApi('incentives:edit');
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await req.json();
  const { status, deniedReason } = body;

  if (!status) {
    return Response.json({ error: 'status is required' }, { status: 400 });
  }

  const existing = await db.reclaimedIncentive.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: 'Incentive not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = { status };

  if (status === 'APPROVED') {
    data.approvedAt = new Date();
    data.approvedBy = guard.user.userId;
  } else if (status === 'PAID') {
    data.paidAt = new Date();
  } else if (status === 'DENIED') {
    data.deniedAt = new Date();
    data.deniedReason = deniedReason ?? null;
  }

  const updated = await db.reclaimedIncentive.update({
    where: { id },
    data: data as any,
  });

  return Response.json(updated);
}

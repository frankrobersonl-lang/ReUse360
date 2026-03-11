import { NextRequest } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const guard = await guardApi('incentives:read');
  if (!guard.ok) return guard.response;

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const accountId = searchParams.get('accountId');

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (accountId) where.accountId = accountId;

  const incentives = await db.reclaimedIncentive.findMany({
    where: where as any,
    orderBy: { appliedAt: 'desc' },
    take: 100,
    include: {
      account: {
        select: { firstName: true, lastName: true, serviceAddress: true, accountId: true },
      },
    },
  });

  return Response.json(incentives);
}

export async function POST(req: NextRequest) {
  const guard = await guardApi('incentives:create');
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const { accountId, type, amount, description } = body;

  if (!accountId || !type || amount == null) {
    return Response.json(
      { error: 'accountId, type, and amount are required' },
      { status: 400 },
    );
  }

  const account = await db.customerAccount.findUnique({ where: { accountId } });
  if (!account) {
    return Response.json({ error: 'Account not found' }, { status: 404 });
  }

  const incentive = await db.reclaimedIncentive.create({
    data: {
      accountId,
      type,
      amount,
      description: description ?? null,
    },
  });

  return Response.json(incentive, { status: 201 });
}

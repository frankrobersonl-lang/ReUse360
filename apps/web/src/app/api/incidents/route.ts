import { auth } from '@clerk/nextjs/server';
import { db } from '@reuse360/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl.searchParams;
  const type = url.get('type') || undefined;
  const status = url.get('status') || undefined;
  const limit = Math.min(Number(url.get('limit') || '500'), 1000);
  const sortBy = url.get('sortBy') || 'detectedAt';
  const sortDir = (url.get('sortDir') || 'desc') as 'asc' | 'desc';

  const violations = await db.violation.findMany({
    take: limit,
    orderBy: { [sortBy]: sortDir },
    where: {
      ...(type ? { violationType: type as any } : {}),
      ...(status ? { status: status as any } : { status: { not: 'DISMISSED' } }),
    },
    include: {
      account: {
        select: {
          accountId: true,
          firstName: true,
          lastName: true,
          phone: true,
          serviceAddress: true,
          isReclaimed: true,
          parcel: {
            select: {
              lat: true,
              lon: true,
            },
          },
        },
      },
    },
  });

  const data = violations
    .filter((v) => v.account?.parcel?.lat && v.account?.parcel?.lon)
    .map((v) => ({
      id: v.id,
      parcelId: v.parcelId,
      accountId: v.accountId,
      meterId: v.meterId,
      violationType: v.violationType,
      status: v.status,
      detectedAt: v.detectedAt.toISOString(),
      readValue: Number(v.readValue),
      flowUnit: v.flowUnit || 'gallons',
      wateringZone: v.wateringZone || undefined,
      ordinanceRef: v.ordinanceRef || undefined,
      cityworksSrId: v.cityworksSrId || undefined,
      notes: v.notes || undefined,
      address: v.account?.serviceAddress,
      geometry: {
        type: 'Point' as const,
        coordinates: [
          Number(v.account!.parcel!.lon),
          Number(v.account!.parcel!.lat),
        ],
      },
      account: v.account
        ? {
            firstName: v.account.firstName || undefined,
            lastName: v.account.lastName || undefined,
            phone: v.account.phone || undefined,
            serviceAddress: v.account.serviceAddress,
            isReclaimed: v.account.isReclaimed,
          }
        : undefined,
    }));

  return NextResponse.json({ data });
}

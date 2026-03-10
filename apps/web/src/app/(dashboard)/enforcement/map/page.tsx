import { requireRole }           from '@/lib/auth.server';
import { db }                    from '@/lib/db';
import ViolationMapLoader        from '@/components/enforcement/ViolationMapLoader';
import type { ViolationMarker }  from '@/components/enforcement/ViolationMap';

export default async function EnforcementMapPage() {
  await requireRole(['ADMIN', 'ANALYST', 'ENFORCEMENT']);

  const violations = await db.violation.findMany({
    take: 500,
    orderBy: { detectedAt: 'desc' },
    where: { status: { not: 'DISMISSED' } },
    include: {
      account: {
        select: {
          firstName: true,
          lastName: true,
          serviceAddress: true,
          parcel: { select: { lat: true, lon: true } },
        },
      },
    },
  });

  // Only include violations with valid coordinates
  const markers: ViolationMarker[] = violations
    .filter((v) => v.account?.parcel?.lat && v.account?.parcel?.lon)
    .map((v) => ({
      id:            v.id,
      caseNumber:    v.caseNumber,
      address:       v.account.serviceAddress,
      accountName:   `${v.account.firstName ?? ''} ${v.account.lastName ?? ''}`.trim() || 'Unknown',
      violationType: v.violationType,
      status:        v.status,
      detectedAt:    v.detectedAt.toISOString(),
      lat:           Number(v.account.parcel!.lat),
      lon:           Number(v.account.parcel!.lon),
    }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Violation Map</h1>
        <p className="text-sm text-slate-500">
          {markers.length} violation{markers.length !== 1 ? 's' : ''} with mapped locations
        </p>
      </div>
      <div className="h-[calc(100vh-12rem)]">
        <ViolationMapLoader violations={markers} />
      </div>
    </div>
  );
}

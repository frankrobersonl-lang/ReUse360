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
    <div className="flex flex-col gap-4 h-[calc(100vh-7rem)] lg:h-[calc(100vh-5.5rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Field Map</h1>
          <p className="text-sm text-slate-500">
            {markers.length} active violation{markers.length !== 1 ? 's' : ''} across Pinellas County
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 border border-teal-200">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
          Live
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <ViolationMapLoader violations={markers} />
      </div>
    </div>
  );
}

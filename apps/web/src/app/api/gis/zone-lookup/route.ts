import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import { db } from '@/lib/db';

/**
 * GET /api/gis/zone-lookup?parcelId=123456
 *
 * Returns the watering zone assignment for the given parcel,
 * including the zone rule (allowed days, time windows).
 */
export async function GET(req: NextRequest) {
  const guard = await guardApi('customers:read');
  if (!guard.ok) return guard.response;

  const parcelId = req.nextUrl.searchParams.get('parcelId');
  if (!parcelId) {
    return NextResponse.json(
      { error: 'parcelId query parameter is required' },
      { status: 400 },
    );
  }

  const assignment = await db.parcelZoneAssignment.findFirst({
    where: { parcelId },
    orderBy: { effectiveDate: 'desc' },
  });

  if (!assignment) {
    // Fall back to the Parcel record's wateringZone/irrigationDay
    const parcel = await db.parcel.findUnique({
      where: { parcelId },
      select: { parcelId: true, wateringZone: true, irrigationDay: true },
    });

    if (!parcel) {
      return NextResponse.json({ error: 'Parcel not found' }, { status: 404 });
    }

    return NextResponse.json({
      parcelId:      parcel.parcelId,
      zoneId:        parcel.wateringZone,
      dayOfWeek:     parcel.irrigationDay,
      oddEven:       parcel.irrigationDay === 'ODD' || parcel.irrigationDay === 'EVEN'
        ? parcel.irrigationDay
        : null,
      effectiveDate: null,
      source:        'parcel_record',
      zone:          null,
    });
  }

  const zone = assignment.zoneId
    ? await db.wateringZone.findUnique({ where: { zoneCode: assignment.zoneId } })
    : null;

  return NextResponse.json({
    parcelId:      assignment.parcelId,
    zoneId:        assignment.zoneId,
    zoneName:      assignment.zoneName,
    dayOfWeek:     assignment.dayOfWeek,
    oddEven:       assignment.oddEven,
    effectiveDate: assignment.effectiveDate,
    source:        assignment.source,
    zone: zone
      ? {
          zoneCode:         zone.zoneCode,
          description:      zone.description,
          allowedDays:      zone.allowedDays,
          allowedStartTime: zone.allowedStartTime,
          allowedEndTime:   zone.allowedEndTime,
          ordinanceRef:     zone.ordinanceRef,
        }
      : null,
  });
}

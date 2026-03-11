import { PrismaClient } from '@prisma/client';

/**
 * Look up the watering zone assignment for a given parcel ID.
 * Returns the most recent effective assignment, joined with
 * the WateringZone rule (allowed days, time windows).
 */
export async function getZoneByParcel(
  parcelId: string,
  db: PrismaClient,
) {
  const assignment = await db.parcelZoneAssignment.findFirst({
    where: { parcelId },
    orderBy: { effectiveDate: 'desc' },
  });

  if (!assignment) return null;

  const zone = await db.wateringZone.findUnique({
    where: { zoneCode: assignment.zoneId },
  });

  return {
    parcelId:      assignment.parcelId,
    zoneId:        assignment.zoneId,
    zoneName:      assignment.zoneName,
    dayOfWeek:     assignment.dayOfWeek,
    oddEven:       assignment.oddEven,
    effectiveDate: assignment.effectiveDate,
    geojson:       assignment.geojson,
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
  };
}

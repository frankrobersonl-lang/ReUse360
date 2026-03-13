import { db } from '@/lib/db';

/**
 * Pinellas County watering restriction schedule.
 *
 * Addresses ending in ODD numbers water on: Tuesday, Thursday, Saturday
 * Addresses ending in EVEN numbers water on: Monday, Wednesday, Saturday
 * No irrigation on Sunday or Friday.
 *
 * Allowed times: before 10:00 AM or after 4:00 PM (year-round).
 * During Drought Restrictions, the county may further limit to 1 day/week.
 */

export interface ValidationResult {
  isViolation:   boolean;
  violationType: 'WRONG_DAY' | 'WRONG_TIME' | null;
  reason:        string;
  details: {
    dayOfWeek:    string;
    hour:         number;
    allowedDays:  string[];
    allowedStart: string;
    allowedEnd:   string;
    addressParity: 'ODD' | 'EVEN' | null;
    zone:         string | null;
  };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ODD_DAYS  = ['Tuesday', 'Thursday', 'Saturday'];
const EVEN_DAYS = ['Monday', 'Wednesday', 'Saturday'];

const RESTRICTED_HOUR_START = 10; // 10:00 AM
const RESTRICTED_HOUR_END   = 16; // 4:00 PM

/**
 * Determine address parity from a street address.
 * Returns 'ODD', 'EVEN', or null if no house number found.
 */
function getAddressParity(address: string): 'ODD' | 'EVEN' | null {
  const match = address.match(/^(\d+)/);
  if (!match) return null;
  const houseNum = parseInt(match[1], 10);
  return houseNum % 2 === 0 ? 'EVEN' : 'ODD';
}

/**
 * Validate whether irrigation at a given time for a given parcel constitutes a violation.
 *
 * Uses the following priority for schedule lookup:
 *   1. ParcelZoneAssignment + WateringZone (most specific)
 *   2. Parcel.wateringZone + irrigationDay
 *   3. Default ODD/EVEN schedule from address parity
 */
export async function validateIrrigation(params: {
  parcelId:   string;
  address:    string;
  timestamp:  Date;
}): Promise<ValidationResult> {
  const { parcelId, address, timestamp } = params;

  const dayOfWeek = DAY_NAMES[timestamp.getDay()];
  const hour = timestamp.getHours();

  // Try to find the most specific schedule
  let allowedDays: string[] | null = null;
  let allowedStart = '12:00 AM';
  let allowedEnd   = '10:00 AM & after 4:00 PM';
  let zoneName: string | null = null;

  // Priority 1: ParcelZoneAssignment + WateringZone
  const assignment = await db.parcelZoneAssignment.findFirst({
    where: { parcelId },
    orderBy: { effectiveDate: 'desc' },
  });

  if (assignment?.zoneId) {
    const zone = await db.wateringZone.findUnique({
      where: { zoneCode: assignment.zoneId },
    });

    if (zone && zone.allowedDays.length > 0) {
      allowedDays = zone.allowedDays;
      zoneName = zone.zoneCode;
      if (zone.allowedStartTime) allowedStart = zone.allowedStartTime;
      if (zone.allowedEndTime) allowedEnd = zone.allowedEndTime;
    }
  }

  // Priority 2: Parcel record
  if (!allowedDays) {
    const parcel = await db.parcel.findUnique({
      where: { parcelId },
      select: { wateringZone: true, irrigationDay: true },
    });

    if (parcel?.irrigationDay) {
      if (parcel.irrigationDay === 'ODD') {
        allowedDays = ODD_DAYS;
      } else if (parcel.irrigationDay === 'EVEN') {
        allowedDays = EVEN_DAYS;
      } else {
        allowedDays = [parcel.irrigationDay];
      }
      zoneName = parcel.wateringZone;
    }
  }

  // Priority 3: Default from address parity
  const parity = getAddressParity(address);
  if (!allowedDays) {
    allowedDays = parity === 'EVEN' ? EVEN_DAYS : ODD_DAYS;
  }

  const details: ValidationResult['details'] = {
    dayOfWeek,
    hour,
    allowedDays,
    allowedStart,
    allowedEnd,
    addressParity: parity,
    zone: zoneName,
  };

  // Check wrong-time first (10 AM – 4 PM is prohibited)
  if (hour >= RESTRICTED_HOUR_START && hour < RESTRICTED_HOUR_END) {
    return {
      isViolation: true,
      violationType: 'WRONG_TIME',
      reason: `Irrigation detected at ${hour}:00 during restricted hours (10 AM – 4 PM)`,
      details,
    };
  }

  // Check wrong-day
  if (!allowedDays.includes(dayOfWeek)) {
    return {
      isViolation: true,
      violationType: 'WRONG_DAY',
      reason: `Irrigation detected on ${dayOfWeek}, which is not an allowed day for this address (${allowedDays.join(', ')})`,
      details,
    };
  }

  return {
    isViolation: false,
    violationType: null,
    reason: 'Irrigation is within allowed schedule',
    details,
  };
}

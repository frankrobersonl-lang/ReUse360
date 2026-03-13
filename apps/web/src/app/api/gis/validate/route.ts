import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import { validateIrrigation } from '@/lib/gis/validateViolation';

/**
 * POST /api/gis/validate
 *
 * Auto-validate whether irrigation at a given time for a parcel
 * constitutes a watering restriction violation.
 *
 * Body:
 *   parcelId  — parcel ID
 *   address   — street address (for ODD/EVEN fallback)
 *   timestamp — ISO 8601 datetime of detected irrigation
 */
export async function POST(req: NextRequest) {
  const guard = await guardApi('violations:read');
  if (!guard.ok) return guard.response;

  let body: { parcelId?: string; address?: string; timestamp?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { parcelId, address, timestamp } = body;
  if (!parcelId || !address || !timestamp) {
    return NextResponse.json(
      { error: 'parcelId, address, and timestamp are required' },
      { status: 400 },
    );
  }

  const ts = new Date(timestamp);
  if (isNaN(ts.getTime())) {
    return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 });
  }

  try {
    const result = await validateIrrigation({ parcelId, address, timestamp: ts });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Validation failed' },
      { status: 500 },
    );
  }
}

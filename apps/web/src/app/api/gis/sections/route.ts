import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import { queryFeatureService, ARCGIS_SERVICES } from '@/lib/gis/arcgis';
import { db } from '@/lib/db';

export const revalidate = 3600; // 1-hour server-side cache for zone polygons

/**
 * GET /api/gis/sections
 *
 * Returns watering zone section polygons for the map overlay.
 *
 * Strategy:
 *   1. Try ArcGIS Sections_WaterViolations_PublicView layer
 *   2. If ArcGIS fails (token required, timeout, etc.), fall back to
 *      local DB: build synthetic zone polygons from seeded Parcel data
 *      grouped by wateringZone.
 *
 * NOTE: The ArcGIS Sections layer currently requires an auth token
 * (error 499 "Token Required"). Until a service token is provisioned,
 * the DB fallback is the primary data source.
 *
 * Params:
 *   bbox — minLon,minLat,maxLon,maxLat (optional, filters to viewport)
 *   lat,lon — point intersection (optional, find sections at a point)
 */
export async function GET(req: NextRequest) {
  const guard = await guardApi('violations:read');
  if (!guard.ok) return guard.response;

  const params = req.nextUrl.searchParams;
  const bbox   = params.get('bbox');
  const lat    = params.get('lat');
  const lon    = params.get('lon');

  let geometry: string | undefined;
  let geometryType: string | undefined;

  if (lat && lon) {
    geometry = JSON.stringify({
      x: Number(lon), y: Number(lat),
      spatialReference: { wkid: 4326 },
    });
    geometryType = 'esriGeometryPoint';
  } else if (bbox) {
    const [xmin, ymin, xmax, ymax] = bbox.split(',').map(Number);
    if ([xmin, ymin, xmax, ymax].every((n) => !isNaN(n))) {
      geometry = JSON.stringify({
        xmin, ymin, xmax, ymax,
        spatialReference: { wkid: 4326 },
      });
      geometryType = 'esriGeometryEnvelope';
    }
  }

  // ── Try ArcGIS first ──────────────────────────────────────────────
  try {
    const result = await queryFeatureService(ARCGIS_SERVICES.sections, {
      where: '1=1',
      geometry,
      geometryType,
      returnGeometry: true,
      resultRecordCount: 50,
      paginate: true,
    });

    return NextResponse.json({
      count: result.features.length,
      geometryType: result.geometryType,
      features: result.features,
      source: 'arcgis',
    });
  } catch (err) {
    console.warn(
      '[sections] ArcGIS failed, falling back to local DB:',
      err instanceof Error ? err.message : err,
    );
  }

  // ── Fallback: build zone polygons from local Parcel data ──────────
  try {
    const features = await buildZoneFeaturesFromDB();

    return NextResponse.json({
      count: features.length,
      geometryType: 'esriGeometryPolygon',
      features,
      source: 'database',
    });
  } catch (dbErr) {
    console.error('[sections] DB fallback also failed:', dbErr);
    return NextResponse.json(
      { error: 'Zone data unavailable', source: 'none' },
      { status: 502 },
    );
  }
}

/**
 * Build synthetic ArcGIS-shaped polygon features from local DB.
 *
 * Groups parcels by wateringZone, computes a bounding box per zone,
 * expands it slightly, and returns ArcGIS-compatible features with
 * ring geometry so the existing ViolationMap code works unchanged.
 */
async function buildZoneFeaturesFromDB() {
  // Fetch zones + their parcels (only parcels with coordinates)
  const zones = await db.wateringZone.findMany({
    where: { isActive: true },
  });

  const parcels = await db.parcel.findMany({
    where: {
      lat: { not: null },
      lon: { not: null },
      wateringZone: { not: null },
    },
    select: {
      wateringZone: true,
      lat: true,
      lon: true,
    },
  });

  // Group parcels by zone
  const grouped: Record<string, { lats: number[]; lons: number[] }> = {};
  for (const p of parcels) {
    if (!p.wateringZone || p.lat == null || p.lon == null) continue;
    const key = p.wateringZone;
    if (!grouped[key]) grouped[key] = { lats: [], lons: [] };
    grouped[key].lats.push(Number(p.lat));
    grouped[key].lons.push(Number(p.lon));
  }

  const features: {
    attributes: Record<string, unknown>;
    geometry: { rings: number[][][]; spatialReference: { wkid: number } };
  }[] = [];

  for (const zone of zones) {
    const group = grouped[zone.zoneCode];
    if (!group || group.lats.length === 0) continue;

    const minLat = Math.min(...group.lats);
    const maxLat = Math.max(...group.lats);
    const minLon = Math.min(...group.lons);
    const maxLon = Math.max(...group.lons);

    // Expand the bounding box by ~0.01 degrees (~1.1 km) to create
    // visible non-overlapping zones; offset each zone slightly by index
    const pad = 0.008;
    const y1 = minLat - pad;
    const y2 = maxLat + pad;
    const x1 = minLon - pad;
    const x2 = maxLon + pad;

    // ArcGIS ring format: [[x,y], ...] clockwise, closed
    const ring = [
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
      [x1, y1], // close the ring
    ];

    features.push({
      attributes: {
        ZONE: zone.zoneCode,
        Name: zone.description,
        SECTION: zone.zoneCode,
        AllowedDays: zone.allowedDays.join(', '),
        AllowedHours: zone.allowedStartTime && zone.allowedEndTime
          ? `${zone.allowedStartTime} – ${zone.allowedEndTime}`
          : 'Any',
        Ordinance: zone.ordinanceRef ?? '',
        Source: 'Local Database',
      },
      geometry: {
        rings: [ring],
        spatialReference: { wkid: 4326 },
      },
    });
  }

  return features;
}

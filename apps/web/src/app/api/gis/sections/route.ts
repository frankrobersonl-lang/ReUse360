import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import { queryFeatureService, ARCGIS_SERVICES } from '@/lib/gis/arcgis';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gis/sections
 *
 * Queries the Sections_WaterViolations_PublicView ArcGIS layer.
 * Returns watering zone section polygons for map overlay.
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

  try {
    const result = await queryFeatureService(ARCGIS_SERVICES.sections, {
      where: '1=1',
      geometry,
      geometryType,
      returnGeometry: true,
      paginate: true,
    });

    return NextResponse.json({
      count: result.features.length,
      geometryType: result.geometryType,
      features: result.features,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'ArcGIS query failed' },
      { status: 502 },
    );
  }
}

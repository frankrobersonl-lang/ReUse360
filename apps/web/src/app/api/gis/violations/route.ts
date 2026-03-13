import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import { queryFeatureService, ARCGIS_SERVICES } from '@/lib/gis/arcgis';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gis/violations
 *
 * Queries the WaterViolations_ReadOnlyView ArcGIS layer.
 * Supports bbox, status, and limit query params.
 */
export async function GET(req: NextRequest) {
  const guard = await guardApi('violations:read');
  if (!guard.ok) return guard.response;

  const params = req.nextUrl.searchParams;
  const bbox   = params.get('bbox');     // minLon,minLat,maxLon,maxLat
  const status = params.get('status');
  const limit  = Math.min(Number(params.get('limit') || '500'), 2000);

  let where = '1=1';
  if (status) {
    where = `Status = '${status.replace(/'/g, "''")}'`;
  }

  let geometry: string | undefined;
  if (bbox) {
    const [xmin, ymin, xmax, ymax] = bbox.split(',').map(Number);
    if ([xmin, ymin, xmax, ymax].every((n) => !isNaN(n))) {
      geometry = JSON.stringify({
        xmin, ymin, xmax, ymax,
        spatialReference: { wkid: 4326 },
      });
    }
  }

  try {
    const result = await queryFeatureService(ARCGIS_SERVICES.violations, {
      where,
      geometry,
      geometryType: bbox ? 'esriGeometryEnvelope' : undefined,
      returnGeometry: true,
      resultRecordCount: limit,
    });

    const features = result.features.map((f) => ({
      attributes: f.attributes,
      geometry: f.geometry,
    }));

    return NextResponse.json({
      count: features.length,
      features,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'ArcGIS query failed' },
      { status: 502 },
    );
  }
}

/**
 * ArcGIS Feature Service client for Pinellas County eGIS layers.
 *
 * Service URLs provided by Christopher Richardson (GIS meeting 2026-03-13):
 *   1. WaterViolations_ReadOnlyView
 *   2. Sections_WaterViolations_PublicView
 *   3. Pinellas_ParcelPropertyInfo
 */

// ── Service URLs ────────────────────────────────────────────────────────

export const ARCGIS_SERVICES = {
  violations:
    'https://services.arcgis.com/f5HgUpxURgEzTccH/arcgis/rest/services/WaterViolations_ReadOnlyView/FeatureServer/0',
  sections:
    'https://services.arcgis.com/f5HgUpxURgEzTccH/arcgis/rest/services/Sections_WaterViolations_PublicView/FeatureServer/0',
  parcels:
    'https://services.arcgis.com/f5HgUpxURgEzTccH/arcgis/rest/services/Pinellas_ParcelPropertyInfo/FeatureServer/0',
} as const;

export type ArcGISLayerKey = keyof typeof ARCGIS_SERVICES;

// ── Types ───────────────────────────────────────────────────────────────

export interface ArcGISQueryOptions {
  where?: string;
  outFields?: string;
  returnGeometry?: boolean;
  geometryType?: string;
  geometry?: string;
  spatialRel?: string;
  inSR?: number;
  outSR?: number;
  resultOffset?: number;
  resultRecordCount?: number;
  orderByFields?: string;
}

export interface ArcGISFeature {
  attributes: Record<string, unknown>;
  geometry?: ArcGISRing | ArcGISPoint | null;
}

export interface ArcGISRing {
  rings?: number[][][];
  spatialReference?: { wkid: number };
}

export interface ArcGISPoint {
  x: number;
  y: number;
  spatialReference?: { wkid: number };
}

export interface ArcGISQueryResult {
  features: ArcGISFeature[];
  exceededTransferLimit?: boolean;
  fields?: { name: string; type: string; alias: string }[];
  geometryType?: string;
  spatialReference?: { wkid: number };
}

// ── Query helper ────────────────────────────────────────────────────────

/**
 * Query an ArcGIS Feature Service layer. Handles pagination automatically
 * when `paginate: true` is passed.
 */
export async function queryFeatureService(
  serviceUrl: string,
  options: ArcGISQueryOptions & { paginate?: boolean } = {},
): Promise<ArcGISQueryResult> {
  const { paginate = false, ...queryOpts } = options;
  const allFeatures: ArcGISFeature[] = [];
  let offset = queryOpts.resultOffset ?? 0;
  const pageSize = queryOpts.resultRecordCount ?? 1000;
  let fields: ArcGISQueryResult['fields'];
  let geometryType: string | undefined;
  let spatialReference: ArcGISQueryResult['spatialReference'];

  do {
    const url = new URL(serviceUrl.replace(/\/$/, '') + '/query');
    url.searchParams.set('where', queryOpts.where ?? '1=1');
    url.searchParams.set('outFields', queryOpts.outFields ?? '*');
    url.searchParams.set('returnGeometry', String(queryOpts.returnGeometry ?? true));
    url.searchParams.set('outSR', String(queryOpts.outSR ?? 4326));
    url.searchParams.set('f', 'json');
    url.searchParams.set('resultOffset', String(offset));
    url.searchParams.set('resultRecordCount', String(pageSize));

    if (queryOpts.geometry) {
      url.searchParams.set('geometry', queryOpts.geometry);
      url.searchParams.set('geometryType', queryOpts.geometryType ?? 'esriGeometryPoint');
      url.searchParams.set('spatialRel', queryOpts.spatialRel ?? 'esriSpatialRelIntersects');
      if (queryOpts.inSR) url.searchParams.set('inSR', String(queryOpts.inSR));
    }

    if (queryOpts.orderByFields) {
      url.searchParams.set('orderByFields', queryOpts.orderByFields);
    }

    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) {
      throw new Error(`ArcGIS query failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as ArcGISQueryResult & { error?: { message: string } };
    if (data.error) {
      throw new Error(`ArcGIS error: ${data.error.message}`);
    }

    if (!fields) fields = data.fields;
    if (!geometryType) geometryType = data.geometryType;
    if (!spatialReference) spatialReference = data.spatialReference;

    const features = data.features ?? [];
    allFeatures.push(...features);

    if (!paginate || features.length < pageSize || !data.exceededTransferLimit) break;
    offset += features.length;
  } while (true);

  return { features: allFeatures, fields, geometryType, spatialReference };
}

// ── Convenience queries ─────────────────────────────────────────────────

/**
 * Look up a parcel by PARCELID, address text, or lat/lng coordinates.
 */
export async function lookupParcel(params: {
  parcelId?: string;
  address?: string;
  lat?: number;
  lon?: number;
}): Promise<ArcGISFeature | null> {
  let where = '1=1';
  let geometry: string | undefined;
  let geometryType: string | undefined;

  if (params.parcelId) {
    where = `PARCELID = '${params.parcelId.replace(/'/g, "''")}'`;
  } else if (params.address) {
    const escaped = params.address.replace(/'/g, "''");
    where = `SITEADDR LIKE '%${escaped}%'`;
  } else if (params.lat != null && params.lon != null) {
    geometry = JSON.stringify({ x: params.lon, y: params.lat, spatialReference: { wkid: 4326 } });
    geometryType = 'esriGeometryPoint';
  } else {
    return null;
  }

  const result = await queryFeatureService(ARCGIS_SERVICES.parcels, {
    where,
    geometry,
    geometryType,
    returnGeometry: true,
    resultRecordCount: 1,
  });

  return result.features[0] ?? null;
}

/**
 * Query watering zone sections that contain a given point.
 */
export async function getZoneSections(lat: number, lon: number): Promise<ArcGISFeature[]> {
  const result = await queryFeatureService(ARCGIS_SERVICES.sections, {
    geometry: JSON.stringify({ x: lon, y: lat, spatialReference: { wkid: 4326 } }),
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    returnGeometry: true,
  });

  return result.features;
}

/**
 * Convert ArcGIS ring geometry to GeoJSON polygon.
 */
export function ringsToGeoJSON(
  geometry: ArcGISRing,
): GeoJSON.Polygon | null {
  if (!geometry?.rings?.length) return null;
  return {
    type: 'Polygon',
    coordinates: geometry.rings,
  };
}

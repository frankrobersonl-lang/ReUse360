import { db } from '@/lib/db';

/**
 * Import watering zone assignments from a CSV string or ArcGIS Feature Service URL.
 *
 * CSV columns: PARCELID, ZONE_ID, DAY_OF_WEEK, ODD_EVEN, EFFECTIVE_DATE
 * ArcGIS: fetches all features from the service and maps attributes to the same shape.
 */

interface ZoneRow {
  parcelId: string;
  zoneId: string;
  dayOfWeek: string | null;
  oddEven: string | null;
  effectiveDate: Date;
  geojson: string | null;
  source: string;
}

interface ImportResult {
  upserted: number;
  skipped: number;
  errors: string[];
}

// ── CSV Import ──────────────────────────────────────────────────────────

function parseCSV(csv: string): ZoneRow[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].toUpperCase().split(',').map((h) => h.trim());
  const colIndex = {
    parcelId:      header.indexOf('PARCELID'),
    zoneId:        header.indexOf('ZONE_ID'),
    dayOfWeek:     header.indexOf('DAY_OF_WEEK'),
    oddEven:       header.indexOf('ODD_EVEN'),
    effectiveDate: header.indexOf('EFFECTIVE_DATE'),
  };

  if (colIndex.parcelId === -1 || colIndex.zoneId === -1) {
    throw new Error('CSV must contain PARCELID and ZONE_ID columns');
  }

  const rows: ZoneRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const parcelId = cols[colIndex.parcelId];
    const zoneId = cols[colIndex.zoneId];
    if (!parcelId || !zoneId) continue;

    rows.push({
      parcelId,
      zoneId,
      dayOfWeek:     colIndex.dayOfWeek !== -1 ? cols[colIndex.dayOfWeek] || null : null,
      oddEven:       colIndex.oddEven !== -1 ? cols[colIndex.oddEven] || null : null,
      effectiveDate: colIndex.effectiveDate !== -1 && cols[colIndex.effectiveDate]
        ? new Date(cols[colIndex.effectiveDate])
        : new Date(),
      geojson: null,
      source:  'CSV',
    });
  }

  return rows;
}

// ── ArcGIS Feature Service Import ───────────────────────────────────────

interface ArcGISFeature {
  attributes: Record<string, unknown>;
  geometry?: unknown;
}

async function fetchArcGISFeatures(serviceUrl: string): Promise<ZoneRow[]> {
  const rows: ZoneRow[] = [];
  let offset = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(serviceUrl.replace(/\/$/, '') + '/query');
    url.searchParams.set('where', '1=1');
    url.searchParams.set('outFields', '*');
    url.searchParams.set('returnGeometry', 'true');
    url.searchParams.set('f', 'json');
    url.searchParams.set('resultOffset', String(offset));
    url.searchParams.set('resultRecordCount', String(pageSize));

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`ArcGIS request failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json() as {
      features?: ArcGISFeature[];
      exceededTransferLimit?: boolean;
    };

    const features = data.features ?? [];
    if (features.length === 0) break;

    for (const feature of features) {
      const attrs = feature.attributes;
      const parcelId = String(attrs.PARCELID ?? attrs.parcelId ?? attrs.ParcelID ?? '');
      const zoneId = String(attrs.ZONE_ID ?? attrs.zone_id ?? attrs.ZoneID ?? attrs.ZONE ?? '');
      if (!parcelId || !zoneId) continue;

      rows.push({
        parcelId,
        zoneId,
        dayOfWeek:     attrs.DAY_OF_WEEK ? String(attrs.DAY_OF_WEEK) : null,
        oddEven:       attrs.ODD_EVEN ? String(attrs.ODD_EVEN) : null,
        effectiveDate: attrs.EFFECTIVE_DATE
          ? new Date(Number(attrs.EFFECTIVE_DATE))
          : new Date(),
        geojson: feature.geometry ? JSON.stringify(feature.geometry) : null,
        source:  'ArcGIS',
      });
    }

    offset += features.length;
    hasMore = data.exceededTransferLimit === true && features.length === pageSize;
  }

  return rows;
}

// ── Upsert Logic ────────────────────────────────────────────────────────

async function upsertRows(rows: ZoneRow[]): Promise<ImportResult> {
  const result: ImportResult = { upserted: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    try {
      await db.parcelZoneAssignment.upsert({
        where: {
          parcelId_zoneId: {
            parcelId: row.parcelId,
            zoneId:   row.zoneId,
          },
        },
        create: {
          parcelId:      row.parcelId,
          zoneId:        row.zoneId,
          dayOfWeek:     row.dayOfWeek,
          oddEven:       row.oddEven,
          effectiveDate: row.effectiveDate,
          geojson:       row.geojson,
          source:        row.source,
        },
        update: {
          dayOfWeek:     row.dayOfWeek,
          oddEven:       row.oddEven,
          effectiveDate: row.effectiveDate,
          geojson:       row.geojson,
          source:        row.source,
        },
      });

      // Also sync the Parcel record's wateringZone and irrigationDay
      await db.parcel.updateMany({
        where: { parcelId: row.parcelId },
        data: {
          wateringZone:  row.zoneId,
          irrigationDay: row.oddEven ?? row.dayOfWeek ?? undefined,
        },
      });

      result.upserted++;
    } catch (err) {
      result.errors.push(`Parcel ${row.parcelId}: ${err instanceof Error ? err.message : String(err)}`);
      result.skipped++;
    }
  }

  return result;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Import from a CSV string.
 */
export async function importFromCSV(csv: string): Promise<ImportResult> {
  const rows = parseCSV(csv);
  if (rows.length === 0) {
    return { upserted: 0, skipped: 0, errors: ['No valid rows found in CSV'] };
  }
  return upsertRows(rows);
}

/**
 * Import from an ArcGIS Feature Service URL.
 * Example: https://maps.pinellascounty.org/arcgis/rest/services/WateringZones/FeatureServer/0
 */
export async function importFromArcGIS(serviceUrl: string): Promise<ImportResult> {
  const rows = await fetchArcGISFeatures(serviceUrl);
  if (rows.length === 0) {
    return { upserted: 0, skipped: 0, errors: ['No features returned from ArcGIS service'] };
  }
  return upsertRows(rows);
}

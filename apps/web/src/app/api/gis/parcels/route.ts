import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import { lookupParcel, getZoneSections } from '@/lib/gis/arcgis';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gis/parcels
 *
 * Parcel lookup via the Pinellas_ParcelPropertyInfo ArcGIS layer.
 * Returns PARCELID, zone, owner info, and geometry.
 *
 * Params (one required):
 *   parcelId — exact parcel ID
 *   address  — address text search (SITEADDR LIKE '%...%')
 *   lat,lon  — point-in-polygon spatial query
 */
export async function GET(req: NextRequest) {
  const guard = await guardApi('customers:read');
  if (!guard.ok) return guard.response;

  const params   = req.nextUrl.searchParams;
  const parcelId = params.get('parcelId');
  const address  = params.get('address');
  const lat      = params.get('lat');
  const lon      = params.get('lon');

  if (!parcelId && !address && !(lat && lon)) {
    return NextResponse.json(
      { error: 'Provide parcelId, address, or lat+lon' },
      { status: 400 },
    );
  }

  try {
    const feature = await lookupParcel({
      parcelId: parcelId ?? undefined,
      address:  address ?? undefined,
      lat:      lat ? Number(lat) : undefined,
      lon:      lon ? Number(lon) : undefined,
    });

    if (!feature) {
      return NextResponse.json({ error: 'Parcel not found' }, { status: 404 });
    }

    const attrs = feature.attributes;

    // Normalize common ArcGIS field names
    const result: Record<string, unknown> = {
      parcelId:    attrs.PARCELID ?? attrs.ParcelID ?? attrs.parcelId,
      siteAddress: attrs.SITEADDR ?? attrs.SiteAddr ?? attrs.siteAddress,
      owner:       attrs.OWN_NAME ?? attrs.OWNER ?? attrs.OwnerName,
      ownerAddr:   attrs.OWN_ADDR ?? attrs.OwnerAddr,
      city:        attrs.CITY ?? attrs.City,
      zip:         attrs.ZIP ?? attrs.Zip,
      useCode:     attrs.USE_CODE ?? attrs.UseCode ?? attrs.DOR_UC,
      landUse:     attrs.LAND_USE ?? attrs.LandUse,
      acreage:     attrs.ACREAGE ?? attrs.Acreage,
      geometry:    feature.geometry,
    };

    // If lat/lon provided, also look up the watering zone section
    if (lat && lon) {
      const sections = await getZoneSections(Number(lat), Number(lon));
      if (sections.length > 0) {
        result.zone = {
          attributes: sections[0].attributes,
          geometry:   sections[0].geometry,
        };
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'ArcGIS query failed' },
      { status: 502 },
    );
  }
}

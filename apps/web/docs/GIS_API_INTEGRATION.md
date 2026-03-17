# GIS API Integration — ReUse360 Plus

**Version:** 1.0
**Last Updated:** 2026-03-17
**Author:** ReUse360 Development Team
**Contact:** Christopher Richardson (GIS Analyst, Pinellas County Utilities)

---

## 1. ArcGIS Feature Service URLs

All layers are hosted on Pinellas County's ArcGIS Online (AGOL) organization. Service URLs were confirmed by Christopher Richardson during the GIS integration meeting on 2026-03-13.

### 1.1 WaterViolations_ReadOnlyView

| Property | Value |
|----------|-------|
| **Service URL** | `https://services.arcgis.com/f5HgUpxURgEzTccH/arcgis/rest/services/WaterViolations_ReadOnlyView/FeatureServer` |
| **Layer 0** | `…/FeatureServer/0` |
| **Purpose** | Read-only view of water violation records for map display and cross-referencing |
| **Geometry Type** | Point (esriGeometryPoint) |
| **Spatial Reference** | WKID 4326 (WGS 84) |
| **Access** | Public (read-only, no token required) |

**Key Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `OBJECTID` | OID | ArcGIS internal ID |
| `CaseNumber` | String | Violation case number (PCU-YYYY-XXXX) |
| `Status` | String | DETECTED, CONFIRMED, NOTIFIED, SR_CREATED, RESOLVED, DISMISSED |
| `ViolationType` | String | WRONG_DAY, WRONG_TIME, EXCESSIVE_USAGE, CONTINUOUS_FLOW, LEAK_DETECTED, PROHIBITED_IRRIGATION |
| `Address` | String | Service address |
| `DetectedDate` | Date | ISO 8601 timestamp |
| `ParcelID` | String | Pinellas County parcel identifier |

**Example Query:**
```
GET …/FeatureServer/0/query?where=Status='DETECTED'&outFields=*&returnGeometry=true&outSR=4326&f=json
```

---

### 1.2 Sections_WaterViolations_PublicView

| Property | Value |
|----------|-------|
| **Service URL** | `https://services.arcgis.com/f5HgUpxURgEzTccH/arcgis/rest/services/Sections_WaterViolations_PublicView/FeatureServer` |
| **Layer 0** | `…/FeatureServer/0` |
| **Purpose** | Watering zone section polygons for map overlay and schedule lookup |
| **Geometry Type** | Polygon (esriGeometryPolygon) |
| **Spatial Reference** | WKID 4326 (WGS 84) |
| **Access** | **Requires ArcGIS Token** (error 499 "Token Required" — see note below) |

> **⚠ Token Required (as of 2026-03-17):** Despite the "PublicView" name, this
> layer returns `{"error":{"code":499,"message":"Token Required","messageCode":"GWM_0003"}}`.
> An ArcGIS Online token or OAuth2 credential is needed to query it.
> Until a service token is provisioned, the `/api/gis/sections` route falls back
> to synthetic zone polygons built from local `Parcel.wateringZone` data.
> **Action item:** Request a read-only application token from Christopher Richardson
> or the Pinellas County AGOL administrator, then set it as `ARCGIS_TOKEN` env var.

**Key Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `OBJECTID` | OID | ArcGIS internal ID |
| `ZONE` / `SECTION` | String | Zone identifier (ODD, EVEN, MON_THU, TUE_FRI, WED_SAT, RECLAIMED) |
| `NAME` | String | Human-readable zone name |
| `ODD_EVEN` | String | Address parity (ODD or EVEN) |
| `DAY_OF_WEEK` | String | Allowed watering days |
| Geometry (rings) | Polygon | Zone boundary coordinates |

**Example Query (point-in-polygon):**
```
GET …/FeatureServer/0/query?geometry={"x":-82.8,"y":27.96,"spatialReference":{"wkid":4326}}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&f=json
```

---

### 1.3 Pinellas_ParcelPropertyInfo

| Property | Value |
|----------|-------|
| **Service URL** | `https://services.arcgis.com/f5HgUpxURgEzTccH/arcgis/rest/services/Pinellas_ParcelPropertyInfo/FeatureServer` |
| **Layer 0** | `…/FeatureServer/0` |
| **Purpose** | Parcel property data for address lookup, owner info, and spatial queries |
| **Geometry Type** | Polygon / Point (varies by layer) |
| **Spatial Reference** | WKID 4326 (WGS 84) |
| **Access** | Public (read-only) |

**Key Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `PARCELID` | String | Pinellas County parcel identifier (e.g., "01-29-15-00000-340-0100") |
| `SITEADDR` | String | Property site address |
| `OWN_NAME` | String | Property owner name |
| `OWN_ADDR` | String | Owner mailing address |
| `CITY` | String | City |
| `ZIP` | String | ZIP code |
| `USE_CODE` / `DOR_UC` | String | Department of Revenue Use Code |
| `LAND_USE` | String | Land use classification |
| `ACREAGE` | Double | Parcel acreage |

**Example Query (address search):**
```
GET …/FeatureServer/0/query?where=SITEADDR LIKE '%1421 BAYSHORE%'&outFields=*&returnGeometry=true&resultRecordCount=10&outSR=4326&f=json
```

---

## 2. Internal API Routes

All internal API routes are in `apps/web/src/app/api/gis/`. They wrap the ArcGIS Feature Service client (`apps/web/src/lib/gis/arcgis.ts`) and add authentication, caching, and data normalization.

### 2.1 GET /api/gis/sections

**Purpose:** Returns watering zone section polygons for map overlay.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bbox` | String | No | Bounding box: `minLon,minLat,maxLon,maxLat` |
| `lat` | Number | No | Latitude for point-in-polygon query |
| `lon` | Number | No | Longitude for point-in-polygon query |

**Auth:** Requires `violations:read` permission.

**Response:**
```json
{
  "count": 12,
  "geometryType": "esriGeometryPolygon",
  "features": [
    {
      "attributes": { "ZONE": "ODD", "NAME": "Section A - Odd", ... },
      "geometry": { "rings": [[[...], ...]] }
    }
  ]
}
```

---

### 2.2 GET /api/gis/parcels

**Purpose:** Parcel lookup via ArcGIS ParcelPropertyInfo.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `parcelId` | String | One required | Exact parcel ID match |
| `address` | String | One required | Address text search (LIKE) |
| `lat,lon` | Numbers | One required | Point-in-polygon spatial query |

**Auth:** Requires `customers:read` permission.

**Response:**
```json
{
  "parcelId": "01-29-15-00000-340-0100",
  "siteAddress": "1421 BAYSHORE BLVD",
  "owner": "MARGARET R SULLIVAN",
  "city": "SAFETY HARBOR",
  "zip": "34695",
  "useCode": "0100",
  "geometry": { "rings": [...] },
  "zone": {
    "attributes": { "ZONE": "EVEN", ... },
    "geometry": { "rings": [...] }
  }
}
```

---

### 2.3 GET /api/gis/violations

**Purpose:** Query ArcGIS violations layer with optional filters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bbox` | String | No | Bounding box filter |
| `status` | String | No | Filter by violation status |
| `limit` | Number | No | Max results (default 500, max 2000) |

**Auth:** Requires `violations:read` permission.

---

### 2.4 GET /api/gis/zone-lookup

**Purpose:** Returns watering zone assignment and schedule rules for a parcel.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `parcelId` | String | Yes | Parcel ID to look up |

**Auth:** Requires `customers:read` permission.

**Resolution Priority:**
1. `ParcelZoneAssignment` + `WateringZone` table (most specific, GIS-sourced)
2. `Parcel.wateringZone` + `Parcel.irrigationDay` (fallback)

**Response:**
```json
{
  "parcelId": "123456",
  "zoneId": "ODD",
  "zoneName": "Odd Address Zone",
  "dayOfWeek": "TUE_THU_SAT",
  "oddEven": "ODD",
  "effectiveDate": "2025-01-01T00:00:00.000Z",
  "source": "ArcGIS",
  "zone": {
    "zoneCode": "ODD",
    "description": "Odd-numbered addresses",
    "allowedDays": ["Tuesday", "Thursday", "Saturday"],
    "allowedStartTime": "00:00",
    "allowedEndTime": "08:00",
    "ordinanceRef": "FAC 40D-22"
  }
}
```

---

### 2.5 POST /api/gis/validate

**Purpose:** Auto-validate whether irrigation at a given time constitutes a violation.

**Auth:** Requires `violations:read` permission.

**Request Body:**
```json
{
  "parcelId": "123456",
  "address": "1421 Bayshore Blvd",
  "timestamp": "2026-03-17T14:30:00.000Z"
}
```

**Response:**
```json
{
  "isViolation": true,
  "violationType": "WRONG_TIME",
  "reason": "Irrigation detected during restricted hours (10 AM - 4 PM)",
  "details": {
    "dayOfWeek": "Tuesday",
    "hour": 14,
    "allowedDays": ["Tuesday", "Thursday", "Saturday"],
    "allowedStart": "00:00",
    "allowedEnd": "08:00",
    "addressParity": "ODD",
    "zone": "ODD"
  }
}
```

---

### 2.6 GET /api/parcel-lookup

**Purpose:** Hybrid parcel search — tries local DB first, falls back to ArcGIS.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | String | Yes | Search query (address, parcel ID, owner name, account number) |

**Auth:** Requires Clerk authentication.

**Resolution Priority:**
1. Local DB exact parcel ID match
2. Local DB address substring search
3. Local DB account number / owner name search
4. ArcGIS ParcelPropertyInfo fallback

**Response:**
```json
{
  "results": [{
    "parcelId": "123456",
    "ownerName": "Margaret R. Sullivan",
    "address": "1421 Bayshore Blvd, Safety Harbor, FL 34695",
    "accountNumber": "PCU-2024-008841",
    "waterSource": "Reclaimed",
    "violationCount": 2,
    "citationStatus": "2nd Citation — $386.00",
    "irrigationDay": "Saturday",
    "wateringZone": "EVEN",
    "lat": 27.9959,
    "lon": -82.7920,
    "isReclaimedEligible": true
  }],
  "source": "database"
}
```

---

## 3. ArcGIS Client Library

**File:** `apps/web/src/lib/gis/arcgis.ts`

### Core Functions

| Function | Description |
|----------|-------------|
| `queryFeatureService(url, options)` | Generic ArcGIS query with automatic pagination |
| `lookupParcel({parcelId?, address?, lat?, lon?})` | Single parcel lookup (3 modes) |
| `searchParcels(address, limit?)` | Multi-result address search |
| `getZoneSections(lat, lon)` | Point-in-polygon zone lookup |
| `getAllZoneSections()` | Full zone polygon set for map overlay |
| `queryArcGISViolations({status?, violationType?, bbox?, limit?})` | Filtered violation query |
| `ringsToGeoJSON(geometry)` | Convert ArcGIS rings to GeoJSON Polygon |

### Query Options

```typescript
interface ArcGISQueryOptions {
  where?: string;           // SQL WHERE clause (default: '1=1')
  outFields?: string;       // Comma-separated fields (default: '*')
  returnGeometry?: boolean; // Include geometry (default: true)
  geometryType?: string;    // esriGeometryPoint, esriGeometryEnvelope
  geometry?: string;        // JSON geometry for spatial queries
  spatialRel?: string;      // esriSpatialRelIntersects (default)
  outSR?: number;           // Output spatial reference (default: 4326)
  resultOffset?: number;    // Pagination offset
  resultRecordCount?: number; // Page size (default: 1000)
  orderByFields?: string;   // Sort order
  paginate?: boolean;       // Auto-paginate all results
}
```

---

## 4. Rate Limits & Caching

### ArcGIS Rate Limits

- **Public services:** No formal rate limit documented, but Esri recommends < 100 concurrent requests
- **MaxRecordCount:** 1000 features per request (handled by pagination in `queryFeatureService`)
- **Transfer limits:** Responses capped at ~10MB; pagination required for large datasets

### Caching Strategy

| Endpoint | Cache Duration | Method |
|----------|---------------|--------|
| ArcGIS queries | 5 minutes | Next.js `fetch({ next: { revalidate: 300 } })` |
| Zone sections | Client-side singleton | Loaded once per map session |
| Parcel lookups | No cache | Fresh data on each query |
| Violation data | No cache (force-dynamic) | Real-time enforcement data |

### Best Practices

1. **Use bbox filtering** when querying large layers (parcels) — avoid `1=1` without spatial bounds
2. **Limit outFields** to only needed columns to reduce response size
3. **Paginate** zone sections (`paginate: true`) since they may exceed MaxRecordCount
4. **Handle `exceededTransferLimit`** in responses — indicates more records are available
5. **Sanitize user input** in WHERE clauses — single quotes are escaped with `''`

---

## 5. Watering Schedule Rules

Per **FAC 40D-22** (Southwest Florida Water Management District Phase II restrictions):

| Zone | Allowed Days | Restricted Hours |
|------|-------------|-----------------|
| ODD (odd-numbered addresses) | Tuesday, Thursday, Saturday | 10:00 AM – 4:00 PM (no irrigation) |
| EVEN (even-numbered addresses) | Monday, Wednesday, Saturday | 10:00 AM – 4:00 PM (no irrigation) |
| MON_THU | Monday, Thursday | 10:00 AM – 4:00 PM |
| TUE_FRI | Tuesday, Friday | 10:00 AM – 4:00 PM |
| WED_SAT | Wednesday, Saturday | 10:00 AM – 4:00 PM |
| RECLAIMED | Any day | No restrictions |

**Violation Types:**
- `WRONG_DAY` — Irrigation detected on a non-permitted day
- `WRONG_TIME` — Irrigation during restricted hours (10 AM – 4 PM)
- `EXCESSIVE_USAGE` — Usage above threshold for the billing period
- `CONTINUOUS_FLOW` — Uninterrupted flow > 24 hours (potential leak)
- `LEAK_DETECTED` — AMI continuous-flow pattern
- `PROHIBITED_IRRIGATION` — Irrigation during drought/emergency ban

**Fine Schedule:**
| Offense | WRONG_DAY/TIME | EXCESSIVE/FLOW | LEAK | PROHIBITED |
|---------|---------------|----------------|------|------------|
| 1st | $193 | $250 | $100 | $386 |
| 2nd | $386 | $500 | $200 | $579 |
| 3rd+ | $579 | $750 | $300 | $772 |

---

## 6. Data Flow Architecture

```
                          ┌──────────────────────┐
                          │  ArcGIS Online (AGOL) │
                          │  Pinellas County Org  │
                          └──────┬───────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                   │
    ┌─────────▼──────┐  ┌──────▼───────┐  ┌───────▼────────┐
    │ WaterViolations │  │  Sections    │  │ ParcelProperty │
    │ ReadOnlyView    │  │  PublicView  │  │ Info           │
    └────────┬───────┘  └──────┬───────┘  └───────┬────────┘
             │                 │                   │
             ▼                 ▼                   ▼
    ┌────────────────────────────────────────────────────────┐
    │              arcgis.ts (Client Library)                 │
    │  queryFeatureService() · lookupParcel() · getZones()   │
    └───────────────────────┬────────────────────────────────┘
                            │
           ┌────────────────┼───────────────────┐
           │                │                    │
    ┌──────▼──────┐  ┌─────▼──────┐  ┌─────────▼────────┐
    │ /api/gis/*  │  │ /api/parcel│  │ /api/incidents    │
    │ routes      │  │ -lookup    │  │                   │
    └──────┬──────┘  └─────┬──────┘  └────────┬──────────┘
           │               │                   │
           └───────────────┼───────────────────┘
                           │
                    ┌──────▼───────┐
                    │  ViolationMap │
                    │  (Leaflet)   │
                    └──────────────┘
```

---

## 7. Security & Access Control

| Route | Permission Required | Roles |
|-------|-------------------|-------|
| `/api/gis/sections` | `violations:read` | ADMIN, ANALYST, ENFORCEMENT |
| `/api/gis/parcels` | `customers:read` | ADMIN, ANALYST, ENFORCEMENT |
| `/api/gis/violations` | `violations:read` | ADMIN, ANALYST, ENFORCEMENT |
| `/api/gis/zone-lookup` | `customers:read` | ADMIN, ANALYST, ENFORCEMENT |
| `/api/gis/validate` | `violations:read` | ADMIN, ANALYST, ENFORCEMENT |
| `/api/parcel-lookup` | Clerk auth only | All authenticated users |

All routes use `guardApi()` from `apps/web/src/lib/auth.server.ts` which checks Clerk session + role-based permissions defined in `packages/auth/src/permissions.ts`.

---

## 8. Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `ArcGIS query failed: 400` | Invalid WHERE clause or field name | Check field names match the service schema |
| `ArcGIS error: Unable to complete operation` | Service temporarily unavailable | Retry after 30s; check AGOL status |
| Zones not loading | CORS or auth issue | Verify service is public; check browser network tab |
| Empty parcel results | Address format mismatch | Use uppercase; try partial address match |
| `exceededTransferLimit: true` | More records than maxRecordCount | Use `paginate: true` in query options |
| Stale map data | Aggressive caching | Clear Next.js cache or reduce revalidate time |

---

*Prepared for IT Review — Pinellas County Utilities*
*ReUse360 Plus v1.0 — Water Conservation Enforcement Platform*

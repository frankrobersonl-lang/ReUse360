---
name: Pinellas County ArcGIS Feature Services
description: Four ArcGIS service URLs provided by Christopher Richardson for GIS integration (violations, sections, parcels, experience app)
type: reference
---

Christopher Richardson (GIS contact) provided 4 ArcGIS Feature Service URLs on 2026-03-13:

1. **WaterViolations_ReadOnlyView**: https://services.arcgis.com/f5HgUpxURgEzTccH/arcgis/rest/services/WaterViolations_ReadOnlyView/FeatureServer
2. **Sections_WaterViolations_PublicView**: https://services.arcgis.com/f5HgUpxURgEzTccH/arcgis/rest/services/Sections_WaterViolations_PublicView/FeatureServer
3. **Pinellas_ParcelPropertyInfo**: https://services.arcgis.com/f5HgUpxURgEzTccH/arcgis/rest/services/Pinellas_ParcelPropertyInfo/FeatureServer
4. **ArcGIS Experience App** (reference only): https://experience.arcgis.com/experience/f65247c14fda46608dbfb8ac1b78dd54

These are configured in `apps/web/src/lib/gis/arcgis.ts` as `ARCGIS_SERVICES`.

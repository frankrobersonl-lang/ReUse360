'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';

// ── Types ─────────────────────────────────────

export interface ViolationMarker {
  id:            string;
  caseNumber:    string | null;
  address:       string;
  accountName:   string;
  violationType: string;
  status:        string;
  detectedAt:    string;
  lat:           number;
  lon:           number;
}

export interface ViolationMapProps {
  violations: ViolationMarker[];
}

// ── Status color coding ───────────────────────

const STATUS_COLORS: Record<string, string> = {
  DETECTED:   '#ef4444',
  CONFIRMED:  '#ef4444',
  NOTIFIED:   '#eab308',
  SR_CREATED: '#f97316',
  RESOLVED:   '#22c55e',
  DISMISSED:  '#94a3b8',
};

const STATUS_LABELS: Record<string, string> = {
  DETECTED:   'Detected',
  CONFIRMED:  'Confirmed',
  NOTIFIED:   'Notified',
  SR_CREATED: 'SR Created',
  RESOLVED:   'Resolved',
  DISMISSED:  'Dismissed',
};

const TYPE_LABELS: Record<string, string> = {
  WRONG_DAY:             'Wrong Day',
  WRONG_TIME:            'Wrong Time',
  EXCESSIVE_USAGE:       'Excessive Usage',
  CONTINUOUS_FLOW:       'Continuous Flow',
  LEAK_DETECTED:         'Leak Detected',
  PROHIBITED_IRRIGATION: 'Prohibited Irrigation',
};

const ALL_TYPES = Object.keys(TYPE_LABELS);

// ── Zone schedule mapping ────────────────────

const ZONE_SCHEDULE: Record<string, { color: string; label: string; days: string; hours: string }> = {
  ODD:       { color: '#0d9488', label: 'Odd Addresses',     days: 'Tue, Thu, Sat',   hours: 'Before 10 AM / After 4 PM' },
  EVEN:      { color: '#0ea5e9', label: 'Even Addresses',    days: 'Mon, Wed, Sat',   hours: 'Before 10 AM / After 4 PM' },
  MON_THU:   { color: '#6366f1', label: 'Mon/Thu Zone',      days: 'Mon, Thu',        hours: 'Before 10 AM / After 4 PM' },
  TUE_FRI:   { color: '#a855f7', label: 'Tue/Fri Zone',      days: 'Tue, Fri',        hours: 'Before 10 AM / After 4 PM' },
  WED_SAT:   { color: '#ec4899', label: 'Wed/Sat Zone',      days: 'Wed, Sat',        hours: 'Before 10 AM / After 4 PM' },
  RECLAIMED: { color: '#10b981', label: 'Reclaimed Water',   days: 'Any day',         hours: 'Any time' },
};

// ── Parcel search result ─────────────────────

interface ParcelResult {
  parcelId: string;
  ownerName: string;
  address: string;
  accountNumber: string | null;
  waterSource: string;
  lastViolationDate: string | null;
  violationCount: number;
  citationStatus: string;
  irrigationDay: string | null;
  wateringZone: string | null;
  lat: number | null;
  lon: number | null;
  isReclaimedEligible: boolean;
}

// ── Component ─────────────────────────────────

export default function ViolationMap({ violations }: ViolationMapProps) {
  const mapRef      = useRef<LeafletMap | null>(null);
  const mapDivRef   = useRef<HTMLDivElement>(null);
  const markersRef  = useRef<LayerGroup | null>(null);
  const clusterRef  = useRef<LayerGroup | null>(null);
  const zonesRef    = useRef<LayerGroup | null>(null);
  const searchPinRef = useRef<LayerGroup | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [typeFilter, setTypeFilter]     = useState<string>('ALL');
  const [dateRange, setDateRange]       = useState<string>('ALL');

  // Map state
  const [mapReady, setMapReady]         = useState(false);
  const [showZones, setShowZones]       = useState(false);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zonesLoaded, setZonesLoaded]   = useState(false);

  // Zone error state
  const [zonesError, setZonesError]       = useState(false);

  // Parcel search
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult]   = useState<ParcelResult | null>(null);
  const [searchError, setSearchError]     = useState('');
  const [showPanel, setShowPanel]         = useState(false);

  // ── Filtering logic ───────────────────────

  const filtered = violations.filter((v) => {
    // Status filter
    if (statusFilter === 'ACTIVE' && (v.status === 'RESOLVED' || v.status === 'DISMISSED')) return false;
    if (statusFilter !== 'ACTIVE' && statusFilter !== 'ALL' && v.status !== statusFilter) return false;

    // Type filter
    if (typeFilter !== 'ALL' && v.violationType !== typeFilter) return false;

    // Date range filter
    if (dateRange !== 'ALL') {
      const d = new Date(v.detectedAt);
      const now = new Date();
      if (dateRange === '24H' && now.getTime() - d.getTime() > 24 * 60 * 60 * 1000) return false;
      if (dateRange === '7D' && now.getTime() - d.getTime() > 7 * 24 * 60 * 60 * 1000) return false;
      if (dateRange === '30D' && now.getTime() - d.getTime() > 30 * 24 * 60 * 60 * 1000) return false;
      if (dateRange === '90D' && now.getTime() - d.getTime() > 90 * 24 * 60 * 60 * 1000) return false;
    }

    return true;
  });

  // ── Status counts ───────────────────────────
  const counts: Record<string, number> = {};
  violations.forEach((v) => { counts[v.status] = (counts[v.status] ?? 0) + 1; });
  const activeCount = violations.filter((v) => v.status !== 'RESOLVED' && v.status !== 'DISMISSED').length;

  // ── Type counts ─────────────────────────────
  const typeCounts: Record<string, number> = {};
  violations.forEach((v) => { typeCounts[v.violationType] = (typeCounts[v.violationType] ?? 0) + 1; });

  // ── Init map ────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapDivRef.current!, {
        center: [27.9659, -82.8001],
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      const street = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '&copy; Esri', maxZoom: 19 }
      );

      L.control.layers({ 'Street': street, 'Satellite': satellite }, {}, { position: 'topright' }).addTo(map);
      L.control.scale({ imperial: true, metric: false }).addTo(map);

      const markers = L.layerGroup().addTo(map);
      const zones = L.layerGroup();
      const searchPins = L.layerGroup().addTo(map);
      markersRef.current = markers;
      zonesRef.current = zones;
      searchPinRef.current = searchPins;
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // ── Load zone polygons ─────────────────────
  const loadZones = useCallback(async () => {
    if (zonesLoaded || zonesLoading || !mapRef.current || !zonesRef.current) return;
    setZonesLoading(true);
    setZonesError(false);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch('/api/gis/sections', { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('Failed to load zones');
      const data = await res.json();

      const L = await import('leaflet');
      zonesRef.current!.clearLayers();

      (data.features ?? []).forEach((feature: { attributes: Record<string, unknown>; geometry?: { rings?: number[][][] } }) => {
        if (!feature.geometry?.rings) return;

        const latlngs = feature.geometry.rings.map((ring: number[][]) =>
          ring.map(([x, y]: number[]) => [y, x] as [number, number])
        );

        // Detect zone type from attributes
        const zoneName = String(
          feature.attributes.ZONE ?? feature.attributes.Zone ??
          feature.attributes.SECTION ?? feature.attributes.Section ??
          feature.attributes.NAME ?? feature.attributes.Name ?? 'Unknown'
        );

        const zoneKey = detectZoneType(zoneName, feature.attributes);
        const schedule = ZONE_SCHEDULE[zoneKey] ?? ZONE_SCHEDULE.ODD;

        const polygon = L.polygon(latlngs, {
          color: schedule.color,
          weight: 2,
          opacity: 0.7,
          fillColor: schedule.color,
          fillOpacity: 0.15,
        });

        // Tooltip on hover with schedule info
        polygon.bindTooltip(
          `<div style="font-family:system-ui,sans-serif;font-size:12px;line-height:1.5;">
            <strong style="color:${schedule.color};">${zoneName}</strong><br/>
            <span style="color:#6b7280;">Days:</span> ${schedule.days}<br/>
            <span style="color:#6b7280;">Hours:</span> ${schedule.hours}
          </div>`,
          { sticky: true, direction: 'top', className: 'zone-tooltip' }
        );

        // Full popup on click
        const attrs = feature.attributes;
        const popupLines = Object.entries(attrs)
          .filter(([, v]) => v != null && v !== '')
          .slice(0, 8)
          .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
          .join('<br/>');

        polygon.bindPopup(
          `<div style="font-family:system-ui,sans-serif;font-size:12px;max-width:260px;">
            <div style="font-weight:700;margin-bottom:6px;color:${schedule.color};font-size:14px;">${zoneName}</div>
            <div style="background:${schedule.color}10;border-radius:6px;padding:8px;margin-bottom:8px;">
              <div><strong>Allowed Days:</strong> ${schedule.days}</div>
              <div><strong>Allowed Hours:</strong> ${schedule.hours}</div>
            </div>
            ${popupLines}
          </div>`,
          { maxWidth: 280 }
        );

        zonesRef.current!.addLayer(polygon);
      });

      setZonesLoaded(true);
    } catch (err) {
      console.error('Failed to load GIS zones:', err);
      setZonesError(true);
      setShowZones(false);
    } finally {
      setZonesLoading(false);
    }
  }, [zonesLoaded, zonesLoading]);

  // ── Toggle zone layer ───────────────────────
  useEffect(() => {
    if (!mapRef.current || !zonesRef.current) return;
    if (showZones) {
      loadZones();
      zonesRef.current.addTo(mapRef.current);
    } else {
      zonesRef.current.remove();
    }
  }, [showZones, mapReady, loadZones]);

  // ── Render markers with clustering ──────────
  useEffect(() => {
    if (!markersRef.current || !mapReady) return;

    Promise.all([import('leaflet'), import('leaflet.markercluster')]).then(([L]) => {
      markersRef.current!.clearLayers();

      // Remove old cluster group
      if (clusterRef.current && mapRef.current) {
        mapRef.current.removeLayer(clusterRef.current as unknown as L.Layer);
      }

      // Create marker cluster group
      const cluster = (L as unknown as { MarkerClusterGroup: new (opts: unknown) => LayerGroup }).MarkerClusterGroup
        ? new (L as unknown as { MarkerClusterGroup: new (opts: unknown) => LayerGroup }).MarkerClusterGroup({
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: (c: { getChildCount: () => number }) => {
              const count = c.getChildCount();
              let size = 'small';
              let radius = 30;
              if (count >= 10) { size = 'medium'; radius = 40; }
              if (count >= 25) { size = 'large'; radius = 50; }
              return L.divIcon({
                className: '',
                html: `<div style="
                  width:${radius}px;height:${radius}px;
                  background:rgba(13,148,136,0.85);
                  border:3px solid white;
                  border-radius:50%;
                  display:flex;align-items:center;justify-content:center;
                  color:white;font-weight:700;font-size:${size === 'large' ? 14 : 12}px;
                  box-shadow:0 2px 8px rgba(0,0,0,0.3);
                ">${count}</div>`,
                iconSize: [radius, radius],
                iconAnchor: [radius / 2, radius / 2],
              });
            },
          })
        : L.layerGroup(); // Fallback if MarkerClusterGroup not available

      filtered.forEach((v) => {
        const color = STATUS_COLORS[v.status] ?? '#94a3b8';

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:16px;height:16px;
            background:${color};
            border:2.5px solid white;
            border-radius:50%;
            box-shadow:0 1px 4px rgba(0,0,0,0.35);
            cursor:pointer;
          "></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker([v.lat, v.lon], { icon });

        const popupHtml = `
          <div style="min-width:260px;font-family:system-ui,sans-serif;font-size:13px;">
            <div style="
              background:${color};color:white;
              padding:8px 12px;border-radius:6px 6px 0 0;
              margin:-8px -8px 10px -8px;
              font-weight:700;font-size:12px;
              display:flex;justify-content:space-between;align-items:center;
            ">
              <span>${STATUS_LABELS[v.status] ?? v.status}</span>
              <span style="opacity:0.85;font-weight:500;font-family:monospace;">${v.caseNumber ?? '—'}</span>
            </div>
            <div style="padding:0 4px;">
              <div style="margin-bottom:6px;">
                <span style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Address</span><br/>
                <strong style="font-size:13px;">${v.address}</strong>
              </div>
              <div style="margin-bottom:6px;">
                <span style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Account</span><br/>
                <span style="font-size:13px;">${v.accountName}</span>
              </div>
              <div style="display:flex;gap:12px;margin-bottom:6px;">
                <div style="flex:1;">
                  <span style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Type</span><br/>
                  <span style="font-size:12px;font-weight:600;color:#b91c1c;">${TYPE_LABELS[v.violationType] ?? v.violationType}</span>
                </div>
                <div style="flex:1;">
                  <span style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Detected</span><br/>
                  <span style="font-size:12px;">${new Date(v.detectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              <div style="border-top:1px solid #e5e7eb;padding-top:8px;display:flex;gap:6px;">
                <a href="/enforcement/violations/${v.id}" style="
                  flex:1;display:block;text-align:center;padding:7px 0;
                  background:#0d9488;color:white;border-radius:6px;
                  text-decoration:none;font-size:12px;font-weight:600;
                ">View Case &rarr;</a>
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml, { maxWidth: 320, className: 'violation-map-popup' });
        cluster.addLayer(marker);
      });

      cluster.addTo(mapRef.current!);
      clusterRef.current = cluster;

      // Fit bounds
      if (filtered.length > 0) {
        const bounds = L.latLngBounds(filtered.map((v) => [v.lat, v.lon] as [number, number]));
        mapRef.current?.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    });
  }, [filtered, mapReady]);

  // ── Parcel search ──────────────────────────
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim() || searchLoading) return;
    setSearchLoading(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const res = await fetch(`/api/parcel-lookup?q=${encodeURIComponent(searchQuery.trim())}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const msg = errData?.error ?? errData?.message ?? `Server error (${res.status})`;
        setSearchError(msg);
        return;
      }
      const data = await res.json();
      const result = data.results?.[0] ?? data.result ?? null;

      if (result) {
        setSearchResult(result);
        setShowPanel(true);

        // Drop a pin on the map
        if (result.lat && result.lon && mapRef.current && searchPinRef.current) {
          const L = await import('leaflet');
          searchPinRef.current.clearLayers();

          const pin = L.marker([result.lat, result.lon], {
            icon: L.divIcon({
              className: '',
              html: `<div style="
                width:24px;height:24px;
                background:#2563eb;
                border:3px solid white;
                border-radius:50%;
                box-shadow:0 2px 8px rgba(0,0,0,0.4);
                display:flex;align-items:center;justify-content:center;
              ">
                <div style="width:8px;height:8px;background:white;border-radius:50%;"></div>
              </div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            }),
          });
          pin.bindPopup(`<strong>${result.address}</strong><br/>${result.ownerName}`, { className: 'violation-map-popup' });
          searchPinRef.current.addLayer(pin);
          mapRef.current.setView([result.lat, result.lon], 16);
        }
      } else {
        setSearchError(`No parcel found matching "${searchQuery.trim()}". Try a full address (e.g. "100 S Missouri Ave") or parcel ID.`);
      }
    } catch (err) {
      setSearchError(err instanceof Error && err.message !== 'Failed to fetch'
        ? err.message
        : 'Unable to reach the server. Check your connection and try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResult(null);
    setSearchError('');
    setShowPanel(false);
    searchPinRef.current?.clearLayers();
  };

  // ── Render ──────────────────────────────────
  return (
    <div className="flex flex-col h-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      {/* Toolbar Row 1 — Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'ACTIVE',    label: `Active (${activeCount})` },
            { key: 'DETECTED',  label: `Detected (${counts['DETECTED'] ?? 0})` },
            { key: 'CONFIRMED', label: `Confirmed (${counts['CONFIRMED'] ?? 0})` },
            { key: 'NOTIFIED',  label: `Notified (${counts['NOTIFIED'] ?? 0})` },
            { key: 'RESOLVED',  label: `Resolved (${counts['RESOLVED'] ?? 0})` },
            { key: 'ALL',       label: `All (${violations.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                statusFilter === key
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {label}
            </button>
          ))}

          <div className="h-5 w-px bg-slate-200 mx-1" />
          <button
            onClick={() => { if (!zonesError) setShowZones(!showZones); }}
            disabled={zonesError}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              zonesError
                ? 'bg-red-50 text-red-400 border-red-200 cursor-not-allowed'
                : showZones
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
            title={zonesError ? 'Zone data unavailable — ArcGIS timed out' : undefined}
          >
            {zonesLoading ? 'Loading...' : zonesError ? 'Zones Unavailable' : showZones ? 'Zones On' : 'Zones'}
          </button>
        </div>
        <span className="text-xs text-slate-500 tabular-nums">
          {filtered.length} violation{filtered.length !== 1 ? 's' : ''} on map
        </span>
      </div>

      {/* Toolbar Row 2 — Type + Date + Search */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-white">
        {/* Type filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-slate-500">Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            autoComplete="off"
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">All Types</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]} ({typeCounts[t] ?? 0})</option>
            ))}
          </select>
        </div>

        {/* Date range filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-slate-500">Period:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            autoComplete="off"
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">All Time</option>
            <option value="24H">Last 24 Hours</option>
            <option value="7D">Last 7 Days</option>
            <option value="30D">Last 30 Days</option>
            <option value="90D">Last 90 Days</option>
          </select>
        </div>

        <div className="h-5 w-px bg-slate-200" />

        {/* Parcel/Address search */}
        <form onSubmit={handleSearch} className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search address or parcel ID..."
            className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={searchLoading || !searchQuery.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {searchLoading ? '...' : 'Find'}
          </button>
          {(searchResult || searchError) && (
            <button
              type="button"
              onClick={clearSearch}
              className="px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-700 border border-slate-200 transition-colors"
            >
              ✕
            </button>
          )}
        </form>
      </div>

      {/* Search error */}
      {searchError && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
          {searchError}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-2 border-b border-slate-100 bg-white text-xs text-slate-600">
        <span className="font-medium text-slate-500">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm" />
          Open
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-500 border border-white shadow-sm" />
          Notified
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500 border border-white shadow-sm" />
          SR Created
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm" />
          Resolved
        </span>
        {showZones && (
          <>
            <span className="h-3 w-px bg-slate-200" />
            {Object.entries(ZONE_SCHEDULE).slice(0, 4).map(([key, z]) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border" style={{ borderColor: z.color, background: z.color + '30' }} />
                {z.label.split(' ')[0]}
              </span>
            ))}
          </>
        )}
      </div>

      {/* Map + Parcel Panel */}
      <div className="flex-1 flex min-h-0">
        {/* Map */}
        <div ref={mapDivRef} className="flex-1 relative z-0" style={{ minHeight: '500px' }} />

        {/* Parcel info panel (slides in from right) */}
        {showPanel && searchResult && (
          <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto flex-shrink-0">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Parcel Details</h3>
              <button onClick={() => setShowPanel(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
            </div>

            <div className="p-4 space-y-4">
              {/* Owner & Address */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Owner</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">{searchResult.ownerName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Address</p>
                <p className="text-sm text-slate-800 mt-0.5">{searchResult.address}</p>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Parcel ID</p>
                  <p className="text-xs font-mono text-slate-800 mt-0.5">{searchResult.parcelId}</p>
                </div>
                {searchResult.accountNumber && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Account</p>
                    <p className="text-xs font-mono text-slate-800 mt-0.5">{searchResult.accountNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Water Source</p>
                  <p className={`text-xs font-semibold mt-0.5 ${
                    searchResult.waterSource === 'Reclaimed' ? 'text-emerald-600' :
                    searchResult.waterSource === 'Potable' ? 'text-sky-600' : 'text-amber-600'
                  }`}>{searchResult.waterSource}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Zone</p>
                  <p className="text-xs text-slate-800 mt-0.5">{searchResult.wateringZone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Irrigation Day</p>
                  <p className="text-xs text-slate-800 mt-0.5">{searchResult.irrigationDay ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Reclaimed Eligible</p>
                  <p className="text-xs text-slate-800 mt-0.5">{searchResult.isReclaimedEligible ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {/* Violations */}
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Violations on Record</span>
                  <span className={`text-sm font-bold ${searchResult.violationCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {searchResult.violationCount}
                  </span>
                </div>
                {searchResult.lastViolationDate && (
                  <p className="text-xs text-slate-500 mt-1">
                    Last: {new Date(searchResult.lastViolationDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-0.5">{searchResult.citationStatus}</p>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <a
                  href={`/enforcement/violations?parcelId=${searchResult.parcelId}`}
                  className="block w-full text-center px-4 py-2.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-colors"
                >
                  View Violations for Parcel
                </a>
                <a
                  href={`/enforcement/patrol-log/new?address=${encodeURIComponent(searchResult.address)}&parcelId=${searchResult.parcelId}`}
                  className="block w-full text-center px-4 py-2.5 bg-white text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  Add to Patrol Log
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leaflet + MarkerCluster CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
      <style jsx global>{`
        .violation-map-popup .leaflet-popup-content-wrapper {
          padding: 8px;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .violation-map-popup .leaflet-popup-content {
          margin: 0;
        }
        .violation-map-popup .leaflet-popup-tip {
          background: white;
        }
        .zone-tooltip {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
        .zone-tooltip::before {
          border-top-color: #e2e8f0 !important;
        }
        .leaflet-marker-icon.marker-cluster {
          background: transparent !important;
        }
      `}</style>
    </div>
  );
}

// ── Helpers ────────────────────────────────────

function detectZoneType(name: string, attrs: Record<string, unknown>): string {
  const upper = name.toUpperCase();
  if (upper.includes('RECLAIMED') || upper.includes('RECLAIMD')) return 'RECLAIMED';
  if (upper.includes('MON') && upper.includes('THU')) return 'MON_THU';
  if (upper.includes('TUE') && upper.includes('FRI')) return 'TUE_FRI';
  if (upper.includes('WED') && upper.includes('SAT')) return 'WED_SAT';
  if (upper.includes('EVEN')) return 'EVEN';
  if (upper.includes('ODD')) return 'ODD';

  // Check attributes for ODD_EVEN field
  const oddEven = String(attrs.ODD_EVEN ?? attrs.oddEven ?? attrs.ODDEVEN ?? '');
  if (oddEven.toUpperCase() === 'EVEN') return 'EVEN';
  if (oddEven.toUpperCase() === 'ODD') return 'ODD';

  // Check day_of_week
  const dow = String(attrs.DAY_OF_WEEK ?? attrs.DayOfWeek ?? '').toUpperCase();
  if (dow.includes('MON') && dow.includes('THU')) return 'MON_THU';
  if (dow.includes('TUE') && dow.includes('FRI')) return 'TUE_FRI';
  if (dow.includes('WED') && dow.includes('SAT')) return 'WED_SAT';

  return 'ODD'; // Default
}

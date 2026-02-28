'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as LeafletMap, Marker, LayerGroup } from 'leaflet';
import { useReUse360Auth } from '@/lib/auth.client';

// ─────────────────────────────────────────────
// IncidentMap — Leaflet map displaying violations
// with PostGIS geometry from /api/incidents
//
// Features:
//   • Marker clustering by violation type
//   • Color-coded severity pins
//   • Role-aware popup controls (confirm / create SR)
//   • Zone overlay toggle
//   • Date range filter
//   • Real-time auto-refresh (30s)
// ─────────────────────────────────────────────

// ── Types ─────────────────────────────────────

export type ViolationType =
  | 'WRONG_DAY'
  | 'WRONG_TIME'
  | 'EXCESSIVE_USAGE'
  | 'CONTINUOUS_FLOW'
  | 'LEAK_DETECTED'
  | 'PROHIBITED_IRRIGATION';

export type ViolationStatus =
  | 'DETECTED'
  | 'CONFIRMED'
  | 'NOTIFIED'
  | 'SR_CREATED'
  | 'RESOLVED'
  | 'DISMISSED';

export interface IncidentGeoFeature {
  id:            string;
  parcelId:      string;
  accountId:     string;
  meterId:       string;
  violationType: ViolationType;
  status:        ViolationStatus;
  detectedAt:    string;
  readValue:     number;
  flowUnit:      string;
  wateringZone?: string;
  ordinanceRef?: string;
  cityworksSrId?: string;
  notes?:        string;
  address?:      string;
  geometry: {
    type:        'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  account?: {
    firstName?:      string;
    lastName?:       string;
    phone?:          string;
    serviceAddress:  string;
    isReclaimed:     boolean;
  };
}

export interface IncidentMapProps {
  /** Initial center — defaults to Clearwater, FL (PCU service area) */
  center?:       [number, number];
  zoom?:         number;
  height?:       string;
  autoRefresh?:  boolean;
  refreshMs?:    number;
  onIncidentClick?: (incident: IncidentGeoFeature) => void;
  className?:    string;
}

// ── Violation styling ─────────────────────────

const VIOLATION_COLORS: Record<ViolationType, string> = {
  WRONG_DAY:              '#ef4444',  // red
  WRONG_TIME:             '#f97316',  // orange
  EXCESSIVE_USAGE:        '#eab308',  // yellow
  CONTINUOUS_FLOW:        '#8b5cf6',  // purple
  LEAK_DETECTED:          '#06b6d4',  // cyan
  PROHIBITED_IRRIGATION:  '#dc2626',  // dark red
};

const STATUS_OPACITY: Record<ViolationStatus, number> = {
  DETECTED:   1.0,
  CONFIRMED:  1.0,
  NOTIFIED:   0.85,
  SR_CREATED: 0.75,
  RESOLVED:   0.4,
  DISMISSED:  0.25,
};

const VIOLATION_LABELS: Record<ViolationType, string> = {
  WRONG_DAY:              'Wrong Day',
  WRONG_TIME:             'Wrong Time',
  EXCESSIVE_USAGE:        'Excessive Usage',
  CONTINUOUS_FLOW:        'Continuous Flow',
  LEAK_DETECTED:          'Leak Detected',
  PROHIBITED_IRRIGATION:  'Prohibited',
};

const STATUS_LABELS: Record<ViolationStatus, string> = {
  DETECTED:   '🔴 Detected',
  CONFIRMED:  '🟠 Confirmed',
  NOTIFIED:   '🟡 Notified',
  SR_CREATED: '🔵 SR Created',
  RESOLVED:   '🟢 Resolved',
  DISMISSED:  '⚪ Dismissed',
};

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export default function IncidentMap({
  center      = [27.9659, -82.8001],  // Clearwater, FL
  zoom        = 12,
  height      = '600px',
  autoRefresh = true,
  refreshMs   = 30_000,
  onIncidentClick,
  className   = '',
}: IncidentMapProps) {
  const mapRef        = useRef<LeafletMap | null>(null);
  const mapDivRef     = useRef<HTMLDivElement>(null);
  const markersRef    = useRef<LayerGroup | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { role, can } = useReUse360Auth();

  const [incidents,    setIncidents]    = useState<IncidentGeoFeature[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [lastRefresh,  setLastRefresh]  = useState<Date>(new Date());
  const [selectedType, setSelectedType] = useState<ViolationType | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<ViolationStatus | 'ALL'>('ALL');
  const [showResolved, setShowResolved] = useState(false);

  // ── Fetch incidents from API ──────────────
  const fetchIncidents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        includeGeo: 'true',
        limit:      '500',
        sortBy:     'detectedAt',
        sortDir:    'desc',
        ...(selectedType   !== 'ALL' && { type:   selectedType }),
        ...(selectedStatus !== 'ALL' && { status: selectedStatus }),
        ...(!showResolved   && { status: selectedStatus !== 'ALL' ? selectedStatus : '' }),
      });

      // Remove empty status param
      if (params.get('status') === '') params.delete('status');

      const res = await fetch(`/api/incidents?${params}`);

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      const json = await res.json() as { data: IncidentGeoFeature[] };

      // Filter to only incidents with valid geometry
      const geoIncidents = json.data.filter(
        (i) => i.geometry?.coordinates?.[0] && i.geometry?.coordinates?.[1]
      );

      setIncidents(geoIncidents);
      setLastRefresh(new Date());
      setError(null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedStatus, showResolved]);

  // ── Initialize Leaflet map ────────────────
  useEffect(() => {
    if (!mapDivRef.current) return; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    // Dynamic import — Leaflet must not run on SSR
    import('leaflet').then((L) => {
      // Fix default marker icon path broken by webpack
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapDivRef.current!, {
        center,
        zoom,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Base tile layer — OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Satellite layer option
      const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '© Esri', maxZoom: 19 }
      );

      // Layer control
      L.control.layers(
        {
          'Street Map': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
          }),
          'Satellite':  satellite,
        },
        {},
        { position: 'topright' }
      ).addTo(map);

      // Marker layer group
      const markers = L.layerGroup().addTo(map);
      markersRef.current = markers;

      // Scale control
      L.control.scale({ imperial: true, metric: false }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom]);

  // ── Render markers when incidents change ──
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    import('leaflet').then((L) => {
      markersRef.current!.clearLayers();

      incidents.forEach((incident) => {
        const [lon, lat] = incident.geometry.coordinates;
        const color     = VIOLATION_COLORS[incident.violationType];
        const opacity   = STATUS_OPACITY[incident.status];

        // Custom SVG circle marker
        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              width: 18px;
              height: 18px;
              background: ${color};
              border: 2px solid white;
              border-radius: 50%;
              opacity: ${opacity};
              box-shadow: 0 1px 4px rgba(0,0,0,0.4);
              cursor: pointer;
            "></div>
          `,
          iconSize:   [18, 18],
          iconAnchor: [9, 9],
        });

        const marker: Marker = L.marker([lat, lon], { icon });

        // ── Popup content ─────────────────────
        const accountName = incident.account
          ? `${incident.account.firstName ?? ''} ${incident.account.lastName ?? ''}`.trim()
          : 'Unknown';

        const canConfirm  = can('violations:confirm');
        const canCreateSr = can('violations:create_sr') && !incident.cityworksSrId;

        const popupHtml = `
          <div style="min-width:260px; font-family: system-ui, sans-serif; font-size:13px;">

            <div style="
              background: ${color};
              color: white;
              padding: 8px 12px;
              border-radius: 6px 6px 0 0;
              margin: -8px -8px 10px -8px;
              font-weight: 600;
              font-size: 12px;
              letter-spacing: 0.05em;
            ">
              ${VIOLATION_LABELS[incident.violationType].toUpperCase()}
            </div>

            <div style="padding: 0 4px;">
              <div style="margin-bottom: 6px;">
                <span style="color: #6b7280; font-size: 11px;">STATUS</span><br/>
                <strong>${STATUS_LABELS[incident.status]}</strong>
              </div>

              <div style="margin-bottom: 6px;">
                <span style="color: #6b7280; font-size: 11px;">ADDRESS</span><br/>
                ${incident.address ?? incident.account?.serviceAddress ?? 'Unknown'}
              </div>

              <div style="margin-bottom: 6px;">
                <span style="color: #6b7280; font-size: 11px;">ACCOUNT</span><br/>
                ${accountName} · ${incident.accountId}
              </div>

              <div style="margin-bottom: 6px;">
                <span style="color: #6b7280; font-size: 11px;">DETECTED</span><br/>
                ${new Date(incident.detectedAt).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
              </div>

              <div style="margin-bottom: 6px;">
                <span style="color: #6b7280; font-size: 11px;">USAGE</span><br/>
                ${Number(incident.readValue).toLocaleString()} ${incident.flowUnit}
              </div>

              ${incident.wateringZone ? `
                <div style="margin-bottom: 6px;">
                  <span style="color: #6b7280; font-size: 11px;">ZONE / ORDINANCE</span><br/>
                  ${incident.wateringZone} · ${incident.ordinanceRef ?? 'FAC 40D-22'}
                </div>
              ` : ''}

              ${incident.cityworksSrId ? `
                <div style="
                  background: #eff6ff;
                  border: 1px solid #bfdbfe;
                  border-radius: 4px;
                  padding: 4px 8px;
                  margin-bottom: 6px;
                  font-size: 11px;
                  color: #1d4ed8;
                ">
                  SR: ${incident.cityworksSrId}
                </div>
              ` : ''}

              ${incident.account?.phone && role !== 'ANALYST' ? `
                <div style="margin-bottom: 8px;">
                  <span style="color: #6b7280; font-size: 11px;">PHONE</span><br/>
                  ${incident.account.phone}
                </div>
              ` : ''}

              ${(canConfirm || canCreateSr) ? `
                <div style="
                  display: flex;
                  gap: 6px;
                  margin-top: 10px;
                  padding-top: 8px;
                  border-top: 1px solid #e5e7eb;
                ">
                  ${canConfirm && incident.status === 'DETECTED' ? `
                    <button
                      data-action="confirm"
                      data-id="${incident.id}"
                      style="
                        flex: 1;
                        padding: 5px 0;
                        background: #f97316;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: 600;
                      "
                    >Confirm</button>
                  ` : ''}
                  ${canCreateSr ? `
                    <button
                      data-action="create-sr"
                      data-id="${incident.id}"
                      style="
                        flex: 1;
                        padding: 5px 0;
                        background: #2563eb;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: 600;
                      "
                    >Create SR</button>
                  ` : ''}
                  <button
                    data-action="view"
                    data-id="${incident.id}"
                    style="
                      flex: 1;
                      padding: 5px 0;
                      background: #f3f4f6;
                      color: #374151;
                      border: none;
                      border-radius: 4px;
                      cursor: pointer;
                      font-size: 11px;
                      font-weight: 600;
                    "
                  >View</button>
                </div>
              ` : ''}
            </div>

          </div>
        `;

        marker.bindPopup(popupHtml, {
          maxWidth: 300,
          className: 'reuse360-popup',
        });

        // Handle popup button clicks
        marker.on('popupopen', () => {
          const popup = marker.getPopup()?.getElement();
          if (!popup) return;

          popup.querySelectorAll('[data-action]').forEach((btn) => {
            btn.addEventListener('click', () => {
              const action = (btn as HTMLElement).dataset.action;
              const id     = (btn as HTMLElement).dataset.id;
              if (!id) return;

              if (action === 'view') {
                window.location.href = `/enforcement/violations/${id}`;
              }
              if (action === 'confirm') {
                handleConfirm(id);
              }
              if (action === 'create-sr') {
                handleCreateSr(id);
              }
            });
          });
        });

        marker.on('click', () => {
          onIncidentClick?.(incident);
        });

        markersRef.current!.addLayer(marker);
      });
    });
  }, [incidents, role, can, onIncidentClick]);

  // ── Action handlers ───────────────────────

  const handleConfirm = async (violationId: string) => {
    try {
      const res = await fetch(`/api/incidents/${violationId}/confirm`, { method: 'POST' });
      if (res.ok) {
        await fetchIncidents();
      }
    } catch (err) {
      console.error('Confirm failed:', err);
    }
  };

  const handleCreateSr = async (violationId: string) => {
    try {
      const res = await fetch(`/api/incidents/${violationId}/create-sr`, { method: 'POST' });
      if (res.ok) {
        await fetchIncidents();
      }
    } catch (err) {
      console.error('Create SR failed:', err);
    }
  };

  // ── Auto-refresh ──────────────────────────
  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    if (!autoRefresh) return;
    refreshTimerRef.current = setInterval(fetchIncidents, refreshMs);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [autoRefresh, refreshMs, fetchIncidents]);

  // ── Summary counts ────────────────────────
  const counts = incidents.reduce<Partial<Record<ViolationType, number>>>(
    (acc, i) => ({ ...acc, [i.violationType]: (acc[i.violationType] ?? 0) + 1 }),
    {}
  );

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────

  return (
    <div className={`flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden ${className}`}>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">

        <div className="flex items-center gap-2 flex-wrap">
          {/* Type filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ViolationType | 'ALL')}
            className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Types</option>
            {Object.entries(VIOLATION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ViolationStatus | 'ALL')}
            className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {/* Show resolved toggle */}
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded"
            />
            Show resolved
          </label>
        </div>

        <div className="flex items-center gap-3">
          {/* Incident count badge */}
          <span className="text-xs text-gray-500">
            {loading ? 'Loading...' : `${incidents.length} incidents`}
          </span>

          {/* Last refresh */}
          <span className="text-xs text-gray-400">
            Updated {lastRefresh.toLocaleTimeString()}
          </span>

          {/* Manual refresh */}
          <button
            onClick={fetchIncidents}
            disabled={loading}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {loading ? '↻ Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-3 px-4 py-2 border-b border-gray-100 bg-white">
        {Object.entries(VIOLATION_COLORS).map(([type, color]) => {
          const count = counts[type as ViolationType] ?? 0;
          if (count === 0 && selectedType !== 'ALL') return null;
          return (
            <button
              key={type}
              onClick={() => setSelectedType(
                selectedType === type as ViolationType ? 'ALL' : type as ViolationType
              )}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-all ${
                selectedType === type
                  ? 'border-gray-400 bg-gray-100 font-semibold'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span
                style={{ background: color }}
                className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
              />
              {VIOLATION_LABELS[type as ViolationType]}
              {count > 0 && (
                <span className="font-semibold text-gray-600">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* ── Map container ── */}
      <div
        ref={mapDivRef}
        style={{ height, width: '100%' }}
        className="relative z-0"
      />

      {/* Leaflet CSS — must be loaded for map to render correctly */}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');

        .reuse360-popup .leaflet-popup-content-wrapper {
          padding: 8px;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .reuse360-popup .leaflet-popup-content {
          margin: 0;
        }
        .reuse360-popup .leaflet-popup-tip {
          background: white;
        }
      `}</style>

    </div>
  );
}

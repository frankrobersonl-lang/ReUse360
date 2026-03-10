'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import Link from 'next/link';

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
  DETECTED:   '#ef4444', // red
  CONFIRMED:  '#ef4444', // red
  NOTIFIED:   '#eab308', // yellow
  SR_CREATED: '#f97316', // orange
  RESOLVED:   '#22c55e', // green
  DISMISSED:  '#94a3b8', // gray
};

const STATUS_LABELS: Record<string, string> = {
  DETECTED:   'Detected',
  CONFIRMED:  'Confirmed',
  NOTIFIED:   'Noticed',
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

// ── Component ─────────────────────────────────

export default function ViolationMap({ violations }: ViolationMapProps) {
  const mapRef     = useRef<LeafletMap | null>(null);
  const mapDivRef  = useRef<HTMLDivElement>(null);
  const markersRef = useRef<LayerGroup | null>(null);

  const [filter, setFilter] = useState<string>('ACTIVE');
  const [mapReady, setMapReady] = useState(false);

  const filtered = violations.filter((v) => {
    if (filter === 'ACTIVE')   return v.status !== 'RESOLVED' && v.status !== 'DISMISSED';
    if (filter === 'ALL')      return true;
    return v.status === filter;
  });

  // ── Status counts ───────────────────────────
  const counts: Record<string, number> = {};
  violations.forEach((v) => {
    counts[v.status] = (counts[v.status] ?? 0) + 1;
  });
  const activeCount = violations.filter(
    (v) => v.status !== 'RESOLVED' && v.status !== 'DISMISSED'
  ).length;

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
        center: [27.9659, -82.8001], // Clearwater / Pinellas County
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Street tiles
      const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Satellite tiles
      const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '&copy; Esri', maxZoom: 19 }
      );

      L.control.layers({ 'Street': street, 'Satellite': satellite }, {}, { position: 'topright' }).addTo(map);
      L.control.scale({ imperial: true, metric: false }).addTo(map);

      const markers = L.layerGroup().addTo(map);
      markersRef.current = markers;
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // ── Render markers ──────────────────────────
  useEffect(() => {
    if (!markersRef.current || !mapReady) return;

    import('leaflet').then((L) => {
      markersRef.current!.clearLayers();

      filtered.forEach((v) => {
        const color = STATUS_COLORS[v.status] ?? '#94a3b8';

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width: 16px; height: 16px;
            background: ${color};
            border: 2.5px solid white;
            border-radius: 50%;
            box-shadow: 0 1px 4px rgba(0,0,0,0.35);
            cursor: pointer;
          "></div>`,
          iconSize:   [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker([v.lat, v.lon], { icon });

        const popupHtml = `
          <div style="min-width:240px; font-family: system-ui, sans-serif; font-size:13px;">
            <div style="
              background: ${color};
              color: white;
              padding: 7px 12px;
              border-radius: 6px 6px 0 0;
              margin: -8px -8px 10px -8px;
              font-weight: 700;
              font-size: 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <span>${STATUS_LABELS[v.status] ?? v.status}</span>
              <span style="opacity:0.85; font-weight:500;">${v.caseNumber ?? '—'}</span>
            </div>
            <div style="padding: 0 4px;">
              <div style="margin-bottom:5px;">
                <span style="color:#6b7280;font-size:11px;">ADDRESS</span><br/>
                <strong>${v.address}</strong>
              </div>
              <div style="margin-bottom:5px;">
                <span style="color:#6b7280;font-size:11px;">ACCOUNT</span><br/>
                ${v.accountName}
              </div>
              <div style="margin-bottom:5px;">
                <span style="color:#6b7280;font-size:11px;">TYPE</span><br/>
                ${TYPE_LABELS[v.violationType] ?? v.violationType}
              </div>
              <div style="margin-bottom:8px;">
                <span style="color:#6b7280;font-size:11px;">DETECTED</span><br/>
                ${new Date(v.detectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div style="border-top:1px solid #e5e7eb; padding-top:8px;">
                <a
                  href="/enforcement/violations/${v.id}"
                  style="
                    display:block;
                    text-align:center;
                    padding:6px 0;
                    background:#0d9488;
                    color:white;
                    border-radius:5px;
                    text-decoration:none;
                    font-size:12px;
                    font-weight:600;
                  "
                >View Full Case &rarr;</a>
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml, { maxWidth: 300, className: 'violation-map-popup' });
        markersRef.current!.addLayer(marker);
      });

      // Fit bounds if we have markers
      if (filtered.length > 0) {
        const bounds = L.latLngBounds(filtered.map((v) => [v.lat, v.lon] as [number, number]));
        mapRef.current?.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    });
  }, [filtered, mapReady]);

  // ── Render ──────────────────────────────────
  return (
    <div className="flex flex-col h-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'ACTIVE',   label: `Active (${activeCount})` },
            { key: 'DETECTED', label: `Detected (${counts['DETECTED'] ?? 0})` },
            { key: 'CONFIRMED', label: `Confirmed (${counts['CONFIRMED'] ?? 0})` },
            { key: 'NOTIFIED', label: `Noticed (${counts['NOTIFIED'] ?? 0})` },
            { key: 'RESOLVED', label: `Resolved (${counts['RESOLVED'] ?? 0})` },
            { key: 'ALL',      label: `All (${violations.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filter === key
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500">
          Showing {filtered.length} violation{filtered.length !== 1 ? 's' : ''} on map
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-100 bg-white text-xs text-slate-600">
        <span className="font-medium text-slate-500">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm" />
          Open
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-500 border border-white shadow-sm" />
          Noticed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500 border border-white shadow-sm" />
          SR Created
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm" />
          Resolved
        </span>
      </div>

      {/* Map */}
      <div ref={mapDivRef} className="flex-1 relative z-0" style={{ minHeight: '500px' }} />

      {/* Leaflet CSS */}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');

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
      `}</style>
    </div>
  );
}

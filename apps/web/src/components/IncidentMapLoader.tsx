import dynamic from 'next/dynamic';
import type { IncidentMapProps } from './IncidentMap';

// ─────────────────────────────────────────────
// IncidentMapLoader
// Leaflet requires window/document — must be
// imported with ssr:false in Next.js
// Use this wrapper in any page/layout
//
// Usage:
//   import IncidentMapLoader from '@/components/IncidentMapLoader';
//   <IncidentMapLoader height="500px" />
// ─────────────────────────────────────────────

const IncidentMap = dynamic(() => import('./IncidentMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{ height: '600px' }}
      className="flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200"
    >
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading map...</span>
      </div>
    </div>
  ),
});

export default function IncidentMapLoader(props: IncidentMapProps) {
  return <IncidentMap {...props} />;
}

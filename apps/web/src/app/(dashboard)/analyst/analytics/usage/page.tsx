import { requireAnalyst } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import db from '@/lib/db';
import { Droplets, MapPin, Home } from 'lucide-react';

export default async function UsageByZonePage() {
  await requireAnalyst();

  const [totalParcels, reclaimedEligible, zoneCounts] = await Promise.all([
    db.parcel.count(),
    db.parcel.count({ where: { isReclaimedEligible: true } }),
    db.parcel.groupBy({ by: ['wateringZone'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Usage by Zone</h1>
        <p className="text-sm text-slate-500 mt-1">Parcel distribution across SWFWMD watering zones</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Total Parcels" value={totalParcels} sub="All linked parcels" icon={Home} />
        <KpiCard label="Reclaimed Eligible" value={reclaimedEligible} sub="Infrastructure available" icon={Droplets} variant="success" />
        <KpiCard label="Zone Groups" value={zoneCounts.length} sub="Distinct watering zones" icon={MapPin} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Zone</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Parcel Count</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">% of Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {zoneCounts.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No parcel data. Run GIS Parcel Sync to populate.</td></tr>
            ) : zoneCounts.map((z) => (
              <tr key={z.wateringZone ?? 'unassigned'} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{z.wateringZone ?? 'Unassigned'}</td>
                <td className="px-4 py-3 text-slate-600">{z._count.id}</td>
                <td className="px-4 py-3 text-slate-500">{totalParcels > 0 ? ((z._count.id / totalParcels) * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { requireAdmin } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import db from '@/lib/db';
import { Scale, MapPin, Clock } from 'lucide-react';

export default async function AdminOrdinancesPage() {
  await requireAdmin();

  const [totalZones, activeZones, zones] = await Promise.all([
    db.wateringZone.count(),
    db.wateringZone.count({ where: { isActive: true } }),
    db.wateringZone.findMany({ orderBy: { zoneCode: 'asc' } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ordinances &amp; Watering Zones</h1>
        <p className="text-sm text-slate-500 mt-1">SWFWMD Phase II watering restriction schedule</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Total Zones" value={totalZones} sub="Configured watering zones" icon={MapPin} />
        <KpiCard label="Active Zones" value={activeZones} sub="Currently enforced" icon={Scale} variant="success" />
        <KpiCard label="Restriction Window" value="12a-8a" sub="Year-round irrigation hours" icon={Clock} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Zone Code</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Description</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Allowed Days</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Hours</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {zones.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No watering zones configured. Seed zones to match SWFWMD schedule.</td></tr>
            ) : zones.map((z) => (
              <tr key={z.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{z.zoneCode}</td>
                <td className="px-4 py-3 text-slate-600">{z.description}</td>
                <td className="px-4 py-3 text-slate-600">{z.allowedDays.join(', ')}</td>
                <td className="px-4 py-3 text-slate-600">{z.allowedStartTime ?? '-'} - {z.allowedEndTime ?? '-'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${z.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {z.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

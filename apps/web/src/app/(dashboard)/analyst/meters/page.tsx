import { requireAnalyst } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import db from '@/lib/db';
import { Gauge, Activity, Droplets, Clock } from 'lucide-react';

export default async function AnalystMetersPage() {
  await requireAnalyst();

  const [totalReads, uniqueMeters, recentReads] = await Promise.all([
    db.meterRead.count(),
    db.meterRead.groupBy({ by: ['meterId'], _count: { id: true } }),
    db.meterRead.findMany({ orderBy: { readTime: 'desc' }, take: 50 }),
  ]);

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const readsToday = await db.meterRead.count({ where: { readTime: { gte: todayStart } } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meter Reads</h1>
        <p className="text-sm text-slate-500 mt-1">Beacon AMI meter data - interval reads, flow, and consumption</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Total Reads" value={totalReads} sub="All ingested meter reads" icon={Activity} />
        <KpiCard label="Unique Meters" value={uniqueMeters.length} sub="Distinct meter IDs" icon={Gauge} />
        <KpiCard label="Reads Today" value={readsToday} sub="Since midnight" icon={Clock} variant={readsToday > 0 ? 'success' : 'default'} />
        <KpiCard label="Latest Read" value={recentReads[0] ? new Date(recentReads[0].readTime).toLocaleDateString() : '-'} sub="Most recent ingestion" icon={Droplets} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Meter ID</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Account</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Read Value</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Flow</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Label</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Read Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recentReads.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No meter reads ingested. Run Beacon AMI connector to populate.</td></tr>
            ) : recentReads.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{r.meterId}</td>
                <td className="px-4 py-3 text-slate-600">{r.accountId}</td>
                <td className="px-4 py-3 text-slate-600">{Number(r.readValue).toLocaleString()} {r.flowUnit ?? 'gal'}</td>
                <td className="px-4 py-3 text-slate-600">{r.flow ? Number(r.flow).toLocaleString() : '-'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${r.label === 'reclaimed' ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'}`}>{r.label ?? 'potable'}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(r.readTime).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { requireAnalyst } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import db from '@/lib/db';
import { TrendingUp, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';

export default async function ViolationTrendsPage() {
  await requireAnalyst();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const [total, last30, prev30, resolved, byType, byStatus] = await Promise.all([
    db.violation.count(),
    db.violation.count({ where: { detectedAt: { gte: thirtyDaysAgo } } }),
    db.violation.count({ where: { detectedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    db.violation.count({ where: { status: 'RESOLVED' } }),
    db.violation.groupBy({ by: ['violationType'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    db.violation.groupBy({ by: ['status'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
  ]);

  const trendPct = prev30 > 0 ? Math.round(((last30 - prev30) / prev30) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Violation Trends</h1>
        <p className="text-sm text-slate-500 mt-1">30-day rolling analysis - SWFWMD compliance tracking</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="All-Time Violations" value={total} sub="Total detected" icon={AlertTriangle} />
        <KpiCard label="Last 30 Days" value={last30} sub="Current period" icon={TrendingUp} trend={{ value: trendPct, label: 'vs prior 30d' }} variant={last30 > prev30 ? 'danger' : 'success'} />
        <KpiCard label="Prior 30 Days" value={prev30} sub="Comparison period" icon={ShieldAlert} />
        <KpiCard label="Resolved" value={resolved} sub="Closed violations" icon={CheckCircle} variant="success" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">By Violation Type</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byType.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400">No violation data yet.</td></tr>
                ) : byType.map((v) => (
                  <tr key={v.violationType} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{v.violationType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-slate-600">{v._count.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">By Status</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byStatus.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400">No violation data yet.</td></tr>
                ) : byStatus.map((s) => (
                  <tr key={s.status} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.status === 'RESOLVED' ? 'bg-green-50 text-green-700' : s.status === 'DISMISSED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s._count.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

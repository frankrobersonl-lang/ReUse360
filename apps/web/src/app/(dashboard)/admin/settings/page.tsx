import { requireAdmin } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import db from '@/lib/db';
import { Plug, CheckCircle, XCircle } from 'lucide-react';

export default async function AdminSettingsPage() {
  await requireAdmin();

  const [totalJobs, completedJobs, failedJobs, recentJobs] = await Promise.all([
    db.connectorJob.count(),
    db.connectorJob.count({ where: { status: 'COMPLETE' } }),
    db.connectorJob.count({ where: { status: 'FAILED' } }),
    db.connectorJob.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Connectors &amp; Integrations</h1>
        <p className="text-sm text-slate-500 mt-1">Beacon AMI, GIS Parcel Sync, Cityworks SR routing</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Total Jobs Run" value={totalJobs} sub="All connector executions" icon={Plug} />
        <KpiCard label="Completed" value={completedJobs} sub="Successful syncs" icon={CheckCircle} variant="success" />
        <KpiCard label="Failed" value={failedJobs} sub="Requires attention" icon={XCircle} variant={failedJobs > 0 ? 'danger' : 'default'} />
      </div>
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Job History</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Job Type</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Attempts</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Started</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentJobs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No connector jobs executed yet.</td></tr>
              ) : recentJobs.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{j.jobType.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${j.status === 'COMPLETE' ? 'bg-green-50 text-green-700' : j.status === 'FAILED' ? 'bg-red-50 text-red-700' : j.status === 'RUNNING' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{j.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{j.attemptCount}/{j.maxAttempts}</td>
                  <td className="px-4 py-3 text-slate-500">{j.startedAt ? new Date(j.startedAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-slate-500">{j.completedAt ? new Date(j.completedAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

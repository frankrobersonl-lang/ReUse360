import { requireAdmin } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import db from '@/lib/db';
import { Activity, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default async function AdminJobsPage() {
  await requireAdmin();

  const [queued, running, complete, failed, retrying, jobs] = await Promise.all([
    db.connectorJob.count({ where: { status: 'QUEUED' } }),
    db.connectorJob.count({ where: { status: 'RUNNING' } }),
    db.connectorJob.count({ where: { status: 'COMPLETE' } }),
    db.connectorJob.count({ where: { status: 'FAILED' } }),
    db.connectorJob.count({ where: { status: 'RETRYING' } }),
    db.connectorJob.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Job Queue</h1>
        <p className="text-sm text-slate-500 mt-1">Beacon AMI, GIS, Cityworks, and violation detection jobs</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KpiCard label="Queued" value={queued} sub="Waiting to run" icon={Clock} variant={queued > 10 ? 'warning' : 'default'} />
        <KpiCard label="Running" value={running} sub="In progress" icon={Activity} variant={running > 0 ? 'success' : 'default'} />
        <KpiCard label="Complete" value={complete} sub="Finished" icon={CheckCircle} variant="success" />
        <KpiCard label="Failed" value={failed} sub="Needs review" icon={XCircle} variant={failed > 0 ? 'danger' : 'default'} />
        <KpiCard label="Retrying" value={retrying} sub="Auto-retry" icon={RefreshCw} variant={retrying > 0 ? 'warning' : 'default'} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Job Type</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Attempts</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Scheduled</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No jobs in queue. Jobs appear when connector syncs are triggered.</td></tr>
            ) : jobs.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{j.jobType.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${j.status === 'COMPLETE' ? 'bg-green-50 text-green-700' : j.status === 'FAILED' ? 'bg-red-50 text-red-700' : j.status === 'RUNNING' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{j.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{j.attemptCount}/{j.maxAttempts}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(j.scheduledAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-red-600 max-w-[200px] truncate">{j.errorMessage ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

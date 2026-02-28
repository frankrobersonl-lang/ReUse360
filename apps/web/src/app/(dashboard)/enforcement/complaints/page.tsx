import { requireEnforcement } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import db from '@/lib/db';
import { MessageSquare, Search, CheckCircle, Copy, XCircle } from 'lucide-react';

export default async function EnforcementComplaintsPage() {
  await requireEnforcement();

  const [open, investigating, resolved, duplicate, complaints] = await Promise.all([
    db.complaint.count({ where: { status: 'OPEN' } }),
    db.complaint.count({ where: { status: 'INVESTIGATING' } }),
    db.complaint.count({ where: { status: 'RESOLVED' } }),
    db.complaint.count({ where: { status: 'DUPLICATE' } }),
    db.complaint.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { violation: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Complaints</h1>
        <p className="text-sm text-slate-500 mt-1">Customer portal, phone, HOA, and field officer complaint tracking</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Open" value={open} sub="Awaiting triage" icon={MessageSquare} variant={open > 5 ? 'warning' : 'default'} />
        <KpiCard label="Investigating" value={investigating} sub="Under review" icon={Search} variant={investigating > 0 ? 'warning' : 'default'} />
        <KpiCard label="Resolved" value={resolved} sub="Closed with resolution" icon={CheckCircle} variant="success" />
        <KpiCard label="Duplicate" value={duplicate} sub="Merged with existing" icon={Copy} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Address</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Source</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Description</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Violation</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Filed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {complaints.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No complaints filed yet. Complaints can be submitted via customer portal, phone, or field officers.</td></tr>
            ) : complaints.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{c.address}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">{c.source.replace(/_/g, ' ')}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.status === 'RESOLVED' ? 'bg-green-50 text-green-700' : c.status === 'INVESTIGATING' ? 'bg-amber-50 text-amber-700' : c.status === 'OPEN' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[250px] truncate">{c.description}</td>
                <td className="px-4 py-3 text-slate-500">{c.violation ? c.violation.violationType.replace(/_/g, ' ') : '-'}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

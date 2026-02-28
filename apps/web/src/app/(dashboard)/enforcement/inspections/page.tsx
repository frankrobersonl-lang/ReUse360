import { requireEnforcement } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import db from '@/lib/db';
import { ClipboardCheck, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default async function EnforcementInspectionsPage() {
  await requireEnforcement();

  const [scheduled, inProgress, complete, noAccess, inspections] = await Promise.all([
    db.inspection.count({ where: { status: 'SCHEDULED' } }),
    db.inspection.count({ where: { status: 'IN_PROGRESS' } }),
    db.inspection.count({ where: { status: 'COMPLETE' } }),
    db.inspection.count({ where: { status: 'NO_ACCESS' } }),
    db.inspection.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { violation: true, assignedUser: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inspections</h1>
        <p className="text-sm text-slate-500 mt-1">Field inspection scheduling and tracking - Cityworks integration</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Scheduled" value={scheduled} sub="Pending dispatch" icon={Clock} variant={scheduled > 10 ? 'warning' : 'default'} />
        <KpiCard label="In Progress" value={inProgress} sub="Officer on site" icon={ClipboardCheck} variant={inProgress > 0 ? 'success' : 'default'} />
        <KpiCard label="Complete" value={complete} sub="Findings recorded" icon={CheckCircle} variant="success" />
        <KpiCard label="No Access" value={noAccess} sub="Requires reschedule" icon={AlertTriangle} variant={noAccess > 0 ? 'warning' : 'default'} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Address</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Assigned To</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Violation</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Scheduled</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Findings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inspections.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No inspections scheduled. Inspections are created from confirmed violations.</td></tr>
            ) : inspections.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{i.address}</td>
                <td className="px-4 py-3 text-slate-600">{i.assignedUser ? `${i.assignedUser.firstName} ${i.assignedUser.lastName}` : '-'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${i.status === 'COMPLETE' ? 'bg-green-50 text-green-700' : i.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' : i.status === 'NO_ACCESS' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{i.status.replace(/_/g, ' ')}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{i.violation ? i.violation.violationType.replace(/_/g, ' ') : '-'}</td>
                <td className="px-4 py-3 text-slate-500">{i.scheduledDate ? new Date(i.scheduledDate).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{i.findings ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

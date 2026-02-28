import { requireEnforcement } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import db from '@/lib/db';
import { FileCheck, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default async function EnforcementPermitsPage() {
  await requireEnforcement();

  const [submitted, underReview, approved, denied, permits] = await Promise.all([
    db.permit.count({ where: { status: 'SUBMITTED' } }),
    db.permit.count({ where: { status: 'UNDER_REVIEW' } }),
    db.permit.count({ where: { status: 'APPROVED', expiresAt: { gt: new Date() } } }),
    db.permit.count({ where: { status: 'DENIED' } }),
    db.permit.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { issuedByUser: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Permits</h1>
        <p className="text-sm text-slate-500 mt-1">Irrigation, reclaimed connection, and temporary waiver permits</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Submitted" value={submitted} sub="Awaiting review" icon={Clock} variant={submitted > 5 ? 'warning' : 'default'} />
        <KpiCard label="Under Review" value={underReview} sub="In processing" icon={FileCheck} variant={underReview > 0 ? 'warning' : 'default'} />
        <KpiCard label="Approved" value={approved} sub="Active and not expired" icon={CheckCircle} variant="success" />
        <KpiCard label="Denied" value={denied} sub="Did not meet criteria" icon={XCircle} variant={denied > 0 ? 'danger' : 'default'} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Permit Type</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Account</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Issued By</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Submitted</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Expires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {permits.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No permits submitted yet.</td></tr>
            ) : permits.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{p.permitType.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-slate-600">{p.accountId}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${p.status === 'APPROVED' ? 'bg-green-50 text-green-700' : p.status === 'DENIED' || p.status === 'REVOKED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{p.status.replace(/_/g, ' ')}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.issuedByUser ? `${p.issuedByUser.firstName} ${p.issuedByUser.lastName}` : '-'}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(p.submittedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-500">{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

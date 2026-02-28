import { requireAnalyst } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import db from '@/lib/db';
import { Building2, UserCheck, UserX, Recycle } from 'lucide-react';

export default async function AnalystCustomersPage() {
  await requireAnalyst();

  const [total, active, inactive, reclaimed, customers] = await Promise.all([
    db.customerAccount.count(),
    db.customerAccount.count({ where: { isActive: true } }),
    db.customerAccount.count({ where: { isActive: false } }),
    db.customerAccount.count({ where: { isReclaimed: true } }),
    db.customerAccount.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: { parcel: true, _count: { select: { violations: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customer Accounts</h1>
        <p className="text-sm text-slate-500 mt-1">SAP-linked irrigation accounts - Pinellas County Utilities</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Total Accounts" value={total} sub="All customer records" icon={Building2} />
        <KpiCard label="Active" value={active} sub="Currently active" icon={UserCheck} variant="success" />
        <KpiCard label="Inactive" value={inactive} sub="Closed or suspended" icon={UserX} variant={inactive > 0 ? 'warning' : 'default'} />
        <KpiCard label="Reclaimed" value={reclaimed} sub="Using reclaimed water" icon={Recycle} variant="success" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Customer</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Account ID</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Address</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Violations</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No customer accounts. Import from SAP billing or Beacon AMI.</td></tr>
            ) : customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{c.firstName} {c.lastName}</td>
                <td className="px-4 py-3 text-slate-600">{c.accountId}</td>
                <td className="px-4 py-3 text-slate-600">{c.serviceAddress}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c._count.violations > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{c._count.violations}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.isReclaimed ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'}`}>{c.isReclaimed ? 'Reclaimed' : 'Potable'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

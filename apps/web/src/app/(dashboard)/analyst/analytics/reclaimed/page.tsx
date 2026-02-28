import { requireAnalyst } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import db from '@/lib/db';
import { Recycle, Droplets, Home, TrendingUp } from 'lucide-react';

export default async function ReclaimedWaterPage() {
  await requireAnalyst();

  const [totalAccounts, reclaimedAccounts, eligibleParcels] = await Promise.all([
    db.customerAccount.count({ where: { isActive: true } }),
    db.customerAccount.count({ where: { isReclaimed: true, isActive: true } }),
    db.parcel.count({ where: { isReclaimedEligible: true } }),
  ]);

  const adoptionRate = totalAccounts > 0 ? ((reclaimedAccounts / totalAccounts) * 100).toFixed(1) : '0.0';

  const reclaimedCustomers = await db.customerAccount.findMany({
    where: { isReclaimed: true, isActive: true },
    orderBy: { updatedAt: 'desc' },
    take: 30,
    include: { parcel: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reclaimed Water Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Adoption tracking - potable demand offset through reclaimed irrigation</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Reclaimed Accounts" value={reclaimedAccounts} sub="Active reclaimed customers" icon={Recycle} variant="success" />
        <KpiCard label="Adoption Rate" value={`${adoptionRate}%`} sub="Reclaimed / total active" icon={TrendingUp} variant={Number(adoptionRate) > 20 ? 'success' : 'warning'} />
        <KpiCard label="Eligible Parcels" value={eligibleParcels} sub="Infrastructure available" icon={Home} />
        <KpiCard label="Total Active" value={totalAccounts} sub="All active accounts" icon={Droplets} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Customer</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Account ID</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Service Address</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Zone</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Meter</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reclaimedCustomers.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No reclaimed water customers yet.</td></tr>
            ) : reclaimedCustomers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{c.firstName} {c.lastName}</td>
                <td className="px-4 py-3 text-slate-600">{c.accountId}</td>
                <td className="px-4 py-3 text-slate-600">{c.serviceAddress}</td>
                <td className="px-4 py-3 text-slate-500">{c.parcel?.wateringZone ?? '-'}</td>
                <td className="px-4 py-3 text-slate-500">{c.meterId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

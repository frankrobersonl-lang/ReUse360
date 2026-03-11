import { requireAnalyst } from '@/lib/auth.server';
import { db } from '@/lib/db';
import { KpiCard } from '@/components/ui/KpiCard';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Gift, Clock, CheckCircle, DollarSign } from 'lucide-react';
import { IncentiveChart } from './IncentiveChart';

const TYPE_LABELS: Record<string, string> = {
  CONVERSION_REBATE:       'Conversion Rebate',
  USAGE_MILESTONE:         'Usage Milestone',
  COMPLIANCE_STREAK:       'Compliance Streak',
  OUTREACH_PARTICIPATION:  'Outreach Participation',
};

const STATUS_STYLES: Record<string, string> = {
  PENDING:  'bg-amber-50  text-amber-700  border-amber-200',
  APPROVED: 'bg-blue-50   text-blue-700   border-blue-200',
  PAID:     'bg-green-50  text-green-700  border-green-200',
  DENIED:   'bg-red-50    text-red-700    border-red-200',
};

interface Props {
  searchParams: Promise<{ status?: string; type?: string }>;
}

export default async function IncentiveTrackerPage({ searchParams }: Props) {
  await requireAnalyst();
  const { status, type } = await searchParams;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;

  const [incentives, total, pending, paid, totalPaid, byType] = await Promise.all([
    db.reclaimedIncentive.findMany({
      where: where as any,
      orderBy: { appliedAt: 'desc' },
      take: 50,
      include: {
        account: { select: { firstName: true, lastName: true, serviceAddress: true, accountId: true } },
      },
    }),
    db.reclaimedIncentive.count(),
    db.reclaimedIncentive.count({ where: { status: 'PENDING' } }),
    db.reclaimedIncentive.count({ where: { status: 'PAID' } }),
    db.reclaimedIncentive.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
    }),
    db.reclaimedIncentive.groupBy({
      by: ['type'],
      _count: true,
      _sum: { amount: true },
    }),
  ]);

  const chartData = byType.map((t) => ({
    name: TYPE_LABELS[t.type] ?? t.type,
    count: t._count,
    amount: Number(t._sum.amount ?? 0),
  }));

  const paidAmount = Number(totalPaid._sum.amount ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reclaimed Water Incentives</h1>
          <p className="text-sm text-slate-500">Track rebates, milestones, and compliance rewards</p>
        </div>
        <Link
          href="/analyst/analytics/reclaimed"
          className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-sm font-medium text-slate-700 rounded-lg transition-colors"
        >
          ← Reclaimed Analytics
        </Link>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Total Incentives" value={total} sub="All applications" icon={Gift} />
        <KpiCard label="Pending Review" value={pending} sub="Awaiting approval" icon={Clock} variant={pending > 0 ? 'warning' : 'default'} />
        <KpiCard label="Paid Out" value={paid} sub="Completed payments" icon={CheckCircle} variant="success" />
        <KpiCard label="Total Paid" value={`$${paidAmount.toLocaleString()}`} sub="Disbursed to customers" icon={DollarSign} variant="success" />
      </div>

      {/* Chart */}
      {chartData.length > 0 && <IncentiveChart data={chartData} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['', 'PENDING', 'APPROVED', 'PAID', 'DENIED'].map((s) => {
          const params = new URLSearchParams();
          if (s) params.set('status', s);
          if (type) params.set('type', type);
          const href = `/analyst/analytics/incentives${params.toString() ? `?${params}` : ''}`;
          return (
            <Link
              key={s}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                (status ?? '') === s
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
              )}
            >
              {s || 'All'}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Account</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {incentives.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                    No incentives match this filter
                  </td>
                </tr>
              ) : (
                incentives.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {i.account.firstName} {i.account.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      <Link href={`/analyst/customers/${i.account.accountId}`} className="text-teal-600 hover:text-teal-700">
                        {i.account.accountId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {TYPE_LABELS[i.type] ?? i.type}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-900 whitespace-nowrap">
                      ${Number(i.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border', STATUS_STYLES[i.status] ?? '')}>
                        {i.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap tabular-nums">
                      {new Date(i.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

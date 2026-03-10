import { requireAnalyst }  from '@/lib/auth.server';
import { db }              from '@/lib/db';
import { KpiCard }         from '@/components/ui/KpiCard';
import { AnalystCharts }   from '@/components/charts/AnalystCharts';
import { TrendingUp, Droplets, BarChart3, AlertTriangle } from 'lucide-react';

export default async function AnalystDashboardPage() {
  await requireAnalyst();

  const [totalViolations, totalMeterReads, weekViolations, reclaimedAccounts] = await Promise.all([
    db.violation.count({ where: { status: { not: 'DISMISSED' } } }),
    db.meterRead.count(),
    db.violation.count({
      where: { detectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    }),
    db.customerAccount.count({ where: { isReclaimed: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Analytics Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">AMI data insights — Pinellas County Water Conservation</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Violations"   value={totalViolations}  icon={AlertTriangle} variant="warning" sub="All active" />
        <KpiCard label="This Week"          value={weekViolations}   icon={TrendingUp}    variant={weekViolations > 10 ? 'danger' : 'default'} sub="Last 7 days" />
        <KpiCard label="Meter Reads"        value={totalMeterReads.toLocaleString()} icon={Droplets} sub="Total in DB" />
        <KpiCard label="Reclaimed Accounts" value={reclaimedAccounts} icon={BarChart3}   variant="success" sub="Active connections" />
      </div>

      <AnalystCharts />
    </div>
  );
}

import { requireAnalyst } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import db from '@/lib/db';
import { FileText, AlertTriangle, ClipboardCheck, Droplets } from 'lucide-react';

export default async function AnalystReportsPage() {
  await requireAnalyst();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [violations30d, inspections30d, complaints30d, leaks30d] = await Promise.all([
    db.violation.count({ where: { detectedAt: { gte: thirtyDaysAgo } } }),
    db.inspection.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    db.complaint.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    db.leakAlert.count({ where: { detectedAt: { gte: thirtyDaysAgo } } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports Summary</h1>
        <p className="text-sm text-slate-500 mt-1">30-day rolling snapshot - ReUse360 Plus operational metrics</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Violations" value={violations30d} sub="Last 30 days" icon={AlertTriangle} variant={violations30d > 0 ? 'warning' : 'success'} />
        <KpiCard label="Inspections" value={inspections30d} sub="Last 30 days" icon={ClipboardCheck} />
        <KpiCard label="Complaints" value={complaints30d} sub="Last 30 days" icon={FileText} variant={complaints30d > 5 ? 'warning' : 'default'} />
        <KpiCard label="Leak Alerts" value={leaks30d} sub="Last 30 days" icon={Droplets} variant={leaks30d > 0 ? 'danger' : 'success'} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Available Reports</h2>
        <div className="space-y-3">
          {[
            { name: 'Monthly Violation Summary', desc: 'Violations by type, zone, and status - SWFWMD compliance reporting', status: 'Available' },
            { name: 'Reclaimed Water Adoption', desc: 'Potable-to-reclaimed conversion rate and eligible parcel coverage', status: 'Available' },
            { name: 'Enforcement Activity Log', desc: 'Inspections, complaints, and permit actions by officer', status: 'Available' },
            { name: 'Beacon AMI Ingestion Report', desc: 'Meter read counts, gaps, and connector job success rate', status: 'Available' },
            { name: 'Customer Compliance Scorecard', desc: 'Per-account violation history and voluntary compliance rate', status: 'Coming Soon' },
            { name: 'Irrigation Demand Forecast', desc: 'Zone-level usage projection based on seasonal patterns', status: 'Coming Soon' },
          ].map((r) => (
            <div key={r.name} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-900">{r.name}</p>
                <p className="text-xs text-slate-500">{r.desc}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${r.status === 'Available' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

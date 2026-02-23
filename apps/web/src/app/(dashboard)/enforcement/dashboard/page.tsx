import { requireEnforcement }  from '@/lib/auth.server';
import { db }                  from '@/lib/db';
import { KpiCard }             from '@/components/ui/KpiCard';
import { AlertTriangle, ClipboardCheck, FileCheck, MessageSquare, Droplets } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  DETECTED:  'bg-amber-50  text-amber-700  border-amber-200',
  CONFIRMED: 'bg-orange-50 text-orange-700 border-orange-200',
  NOTIFIED:  'bg-blue-50   text-blue-700   border-blue-200',
  SR_CREATED:'bg-purple-50 text-purple-700 border-purple-200',
  RESOLVED:  'bg-green-50  text-green-700  border-green-200',
  DISMISSED: 'bg-slate-50  text-slate-500  border-slate-200',
};

const TYPE_LABELS: Record<string, string> = {
  WRONG_DAY:            'Wrong Day',
  WRONG_TIME:           'Wrong Time',
  EXCESSIVE_USAGE:      'Excessive Usage',
  CONTINUOUS_FLOW:      'Continuous Flow',
  LEAK_DETECTED:        'Leak Detected',
  PROHIBITED_IRRIGATION:'Prohibited Irrigation',
};

export default async function EnforcementDashboardPage() {
  const user = await requireEnforcement();

  // Run all queries in parallel
  const [
    openViolations,
    pendingInspections,
    activePermits,
    openComplaints,
    recentViolations,
  ] = await Promise.all([
    db.violation.count({ where: { status: { in: ['DETECTED', 'CONFIRMED', 'NOTIFIED'] } } }),
    db.inspection.count({ where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } } }),
    db.permit.count({ where: { status: 'APPROVED', expiresAt: { gt: new Date() } } }),
    db.complaint.count({ where: { status: { in: ['OPEN', 'INVESTIGATING'] } } }),
    db.violation.findMany({
      take:    15,
      orderBy: { detectedAt: 'desc' },
      where:   { status: { not: 'DISMISSED' } },
      include: { account: { select: { serviceAddress: true, firstName: true, lastName: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Enforcement Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Welcome back, {user.firstName ?? user.email.split('@')[0]} — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Open Violations"
          value={openViolations}
          icon={AlertTriangle}
          variant={openViolations > 20 ? 'danger' : openViolations > 10 ? 'warning' : 'default'}
          sub="DETECTED · CONFIRMED · NOTIFIED"
        />
        <KpiCard
          label="Pending Inspections"
          value={pendingInspections}
          icon={ClipboardCheck}
          variant={pendingInspections > 15 ? 'warning' : 'default'}
          sub="SCHEDULED · IN PROGRESS"
        />
        <KpiCard
          label="Active Permits"
          value={activePermits}
          icon={FileCheck}
          variant="success"
          sub="Approved & not expired"
        />
        <KpiCard
          label="Open Complaints"
          value={openComplaints}
          icon={MessageSquare}
          variant={openComplaints > 10 ? 'warning' : 'default'}
          sub="OPEN · INVESTIGATING"
        />
      </div>

      {/* Recent violations table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Recent Violations</h2>
          <Link
            href="/enforcement/violations"
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            View all →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Detected</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentViolations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                    No violations detected — great compliance!
                  </td>
                </tr>
              ) : (
                recentViolations.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {v.account.serviceAddress}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {TYPE_LABELS[v.violationType] ?? v.violationType}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border', STATUS_STYLES[v.status] ?? '')}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(v.detectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/enforcement/violations/${v.id}`}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium whitespace-nowrap"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Log Inspection',   href: '/enforcement/inspections/new', icon: ClipboardCheck, color: 'teal'   },
          { label: 'View Violations',  href: '/enforcement/violations',      icon: AlertTriangle,  color: 'amber'  },
          { label: 'Field Map',        href: '/enforcement/map',             icon: Droplets,       color: 'sky'    },
          { label: 'Open Complaints',  href: '/enforcement/complaints',      icon: MessageSquare,  color: 'orange' },
        ].map(action => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-300 hover:shadow-sm transition-all text-center group"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-50 group-hover:bg-teal-50 flex items-center justify-center transition-colors">
                <Icon className="w-4.5 h-4.5 text-slate-500 group-hover:text-teal-600 transition-colors" />
              </div>
              <span className="text-xs font-medium text-slate-700">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

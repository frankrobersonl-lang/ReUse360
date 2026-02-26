import { requireAdmin } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import db from '@/lib/db';
import {
  Users,
  AlertTriangle,
  Search,
  Droplets,
  ShieldAlert,
  FileCheck,
  MessageSquareWarning,
  Cpu,
  MapPin,
  Activity,
} from 'lucide-react';

export default async function AdminPage() {
  const user = await requireAdmin();

  const [
    totalUsers,
    activeViolations,
    openInspections,
    leakAlerts,
    activePermits,
    openComplaints,
    runningJobs,
    wateringZones,
    violationsToday,
    violationsThisWeek,
    recentViolations,
  ] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.violation.count({ where: { status: { in: ['DETECTED', 'CONFIRMED', 'NOTIFIED'] } } }),
    db.inspection.count({ where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } } }),
    db.leakAlert.count({ where: { resolvedAt: null } }),
    db.permit.count({ where: { status: 'APPROVED', expiresAt: { gt: new Date() } } }),
    db.complaint.count({ where: { status: { in: ['OPEN', 'INVESTIGATING'] } } }),
    db.connectorJob.count({ where: { status: { in: ['QUEUED', 'RUNNING'] } } }),
    db.wateringZone.count({ where: { isActive: true } }),
    db.violation.count({
      where: { detectedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    db.violation.count({
      where: { detectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    db.violation.findMany({
      take: 5,
      orderBy: { detectedAt: 'desc' },
      include: { account: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          ReUse360 Plus — Pinellas County Water Conservation
        </p>
      </div>

      {/* KPI Grid — Row 1: Violations & Enforcement */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Violations & Enforcement
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Violations Today"
            value={violationsToday}
            sub="Detected since midnight"
            icon={AlertTriangle}
            variant={violationsToday > 0 ? 'danger' : 'success'}
          />
          <KpiCard
            label="Violations This Week"
            value={violationsThisWeek}
            sub="Rolling 7-day window"
            icon={ShieldAlert}
            variant={violationsThisWeek > 5 ? 'warning' : 'default'}
          />
          <KpiCard
            label="Active Violations"
            value={activeViolations}
            sub="Detected / Confirmed / Notified"
            icon={AlertTriangle}
            variant={activeViolations > 0 ? 'warning' : 'success'}
          />
          <KpiCard
            label="Open Inspections"
            value={openInspections}
            sub="Scheduled or In Progress"
            icon={Search}
            variant={openInspections > 10 ? 'warning' : 'default'}
          />
        </div>
      </div>

      {/* KPI Grid — Row 2: Operations */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Operations & Compliance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Leak Alerts"
            value={leakAlerts}
            sub="Unresolved continuous flow"
            icon={Droplets}
            variant={leakAlerts > 0 ? 'danger' : 'success'}
          />
          <KpiCard
            label="Active Permits"
            value={activePermits}
            sub="Approved & not expired"
            icon={FileCheck}
          />
          <KpiCard
            label="Open Complaints"
            value={openComplaints}
            sub="Open or Investigating"
            icon={MessageSquareWarning}
            variant={openComplaints > 5 ? 'warning' : 'default'}
          />
          <KpiCard
            label="Watering Zones"
            value={wateringZones}
            sub="SWFWMD Phase II active"
            icon={MapPin}
          />
        </div>
      </div>

      {/* KPI Grid — Row 3: System */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          System & Users
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Users"
            value={totalUsers}
            sub="Active platform users"
            icon={Users}
          />
          <KpiCard
            label="Running Jobs"
            value={runningJobs}
            sub="Beacon / GIS / Cityworks"
            icon={Cpu}
            variant={runningJobs > 0 ? 'success' : 'default'}
          />
        </div>
      </div>

      {/* Recent Violations Table */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Recent Violations
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {recentViolations.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No violations detected yet.</p>
              <p className="text-xs mt-1">Violations will appear here once Beacon AMI data is ingested.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Account</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Detected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentViolations.map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {v.account?.firstName} {v.account?.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{v.account?.serviceAddress}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                        {v.violationType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(v.detectedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

import { requireAdmin } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import db from '@/lib/db';
import { Bell, Send, Eye } from 'lucide-react';

export default async function AdminAuditLogPage() {
  await requireAdmin();

  const [totalAlerts, sentAlerts, readAlerts, recentAlerts] = await Promise.all([
    db.alert.count(),
    db.alert.count({ where: { sentAt: { not: null } } }),
    db.alert.count({ where: { readAt: { not: null } } }),
    db.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { account: true },
    }),
  ]);

  const severityColor = (s: string) => s === 'CRITICAL' ? 'bg-red-50 text-red-700' : s === 'WARNING' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-sm text-slate-500 mt-1">System alerts, notifications, and audit trail</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Total Alerts" value={totalAlerts} sub="All system notifications" icon={Bell} />
        <KpiCard label="Sent" value={sentAlerts} sub="Successfully delivered" icon={Send} variant="success" />
        <KpiCard label="Read" value={readAlerts} sub="Acknowledged by recipient" icon={Eye} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Subject</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Account</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Severity</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Channel</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Sent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recentAlerts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No audit entries yet.</td></tr>
            ) : recentAlerts.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{a.subject}</td>
                <td className="px-4 py-3 text-slate-600">{a.account?.firstName} {a.account?.lastName}</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${severityColor(a.severity)}`}>{a.severity}</span></td>
                <td className="px-4 py-3 text-slate-600">{a.channel}</td>
                <td className="px-4 py-3 text-slate-500">{a.sentAt ? new Date(a.sentAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

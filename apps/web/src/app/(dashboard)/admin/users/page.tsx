import { requireAdmin } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import db from '@/lib/db';
import { Users, UserCheck, UserX, ShieldAlert } from 'lucide-react';

export default async function AdminUsersPage() {
  await requireAdmin();

  const [totalUsers, activeUsers, inactiveUsers, users] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.user.count({ where: { isActive: false } }),
    db.user.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-sm text-slate-500 mt-1">Platform users and role assignments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Total Users" value={totalUsers} sub="All registered users" icon={Users} />
        <KpiCard label="Active" value={activeUsers} sub="Currently enabled" icon={UserCheck} variant="success" />
        <KpiCard label="Inactive" value={inactiveUsers} sub="Disabled accounts" icon={UserX} variant={inactiveUsers > 0 ? 'warning' : 'default'} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No users found.</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{u.firstName} {u.lastName}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700">{u.role}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

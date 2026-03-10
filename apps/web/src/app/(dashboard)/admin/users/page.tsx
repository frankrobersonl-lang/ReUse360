import { requireAdmin } from '@/lib/auth.server';
import { KpiCard } from '@/components/ui/KpiCard';
import { db } from '@/lib/db';
import { Users, UserCheck, UserX, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

const ROLE_STYLES: Record<string, string> = {
  ADMIN:       'bg-violet-50 text-violet-700',
  ANALYST:     'bg-sky-50 text-sky-700',
  ENFORCEMENT: 'bg-orange-50 text-orange-700',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN:       'Administrator',
  ANALYST:     'Data Analyst',
  ENFORCEMENT: 'Enforcement Officer',
};

interface Props {
  searchParams: Promise<{ search?: string; role?: string; status?: string }>
}

export default async function AdminUsersPage({ searchParams }: Props) {
  await requireAdmin();

  const sp = await searchParams;
  const search = sp.search?.trim();
  const roleFilter = sp.role;
  const statusFilter = sp.status;

  const where: Record<string, unknown> = {};
  if (roleFilter) where.role = roleFilter;
  if (statusFilter === 'active') where.isActive = true;
  if (statusFilter === 'inactive') where.isActive = false;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [totalUsers, activeUsers, inactiveUsers, adminCount, users] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.user.count({ where: { isActive: false } }),
    db.user.count({ where: { role: 'ADMIN' } }),
    db.user.findMany({ orderBy: { createdAt: 'desc' }, take: 50, where: where as any }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Platform users and role assignments</p>
        </div>
        <Link
          href="/admin/users/invite"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Users className="w-4 h-4" />
          Invite User
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Total Users" value={totalUsers} sub="All registered users" icon={Users} />
        <KpiCard label="Active" value={activeUsers} sub="Currently enabled" icon={UserCheck} variant="success" />
        <KpiCard label="Inactive" value={inactiveUsers} sub="Disabled accounts" icon={UserX} variant={inactiveUsers > 0 ? 'warning' : 'default'} />
        <KpiCard label="Admins" value={adminCount} sub="Full access users" icon={ShieldAlert} />
      </div>

      {/* Filters */}
      <form className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder="Search by name or email..."
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 w-64"
        />
        <select
          name="role"
          defaultValue={roleFilter ?? ''}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Administrator</option>
          <option value="ANALYST">Analyst</option>
          <option value="ENFORCEMENT">Enforcement</option>
        </select>
        <select
          name="status"
          defaultValue={statusFilter ?? ''}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
        >
          Filter
        </button>
        {(search || roleFilter || statusFilter) && (
          <Link
            href="/admin/users"
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Created</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No users found.</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {u.firstName || u.lastName
                    ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_STYLES[u.role] ?? 'bg-slate-50 text-slate-700'}`}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-teal-600 hover:text-teal-700 text-xs font-medium"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { requireAdmin } from '@/lib/auth.server'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Shield, Calendar } from 'lucide-react'
import { UserEditForm } from './UserEditForm'

interface Props { params: Promise<{ id: string }> }

const ROLE_STYLES: Record<string, string> = {
  ADMIN:       'bg-violet-50 text-violet-700',
  ANALYST:     'bg-sky-50 text-sky-700',
  ENFORCEMENT: 'bg-orange-50 text-orange-700',
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN:       'Administrator',
  ANALYST:     'Data Analyst',
  ENFORCEMENT: 'Enforcement Officer',
}

export default async function UserDetailPage({ params }: Props) {
  const currentUser = await requireAdmin()
  const { id } = await params

  const user = await db.user.findUnique({ where: { id } })
  if (!user) notFound()

  const isSelf = user.clerkId === currentUser.clerkId

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {user.firstName ?? ''} {user.lastName ?? ''}
            {!user.firstName && !user.lastName && <span className="text-slate-400">Unnamed User</span>}
          </h1>
          <p className="text-sm text-slate-500 mt-1">User details and role management</p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Mail className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Email</span>
          </div>
          <p className="text-sm text-slate-900 truncate">{user.email}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Role</span>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${ROLE_STYLES[user.role] ?? 'bg-slate-50 text-slate-700'}`}>
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Status</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${user.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
            <span className="text-xs text-slate-400">
              since {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <UserEditForm
        userId={user.id}
        currentRole={user.role}
        currentFirstName={user.firstName ?? ''}
        currentLastName={user.lastName ?? ''}
        isActive={user.isActive}
        isSelf={isSelf}
      />
    </div>
  )
}

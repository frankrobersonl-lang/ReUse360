'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, Power, PowerOff } from 'lucide-react'

const ROLES = [
  { value: 'ENFORCEMENT', label: 'Enforcement Officer' },
  { value: 'ANALYST', label: 'Data Analyst' },
  { value: 'ADMIN', label: 'Administrator' },
] as const

interface Props {
  userId: string
  currentRole: string
  currentFirstName: string
  currentLastName: string
  isActive: boolean
  isSelf: boolean
}

export function UserEditForm({ userId, currentRole, currentFirstName, currentLastName, isActive, isSelf }: Props) {
  const router = useRouter()
  const [role, setRole] = useState(currentRole)
  const [firstName, setFirstName] = useState(currentFirstName)
  const [lastName, setLastName] = useState(currentLastName)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, firstName, lastName }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update user')
      }

      setSuccess('User updated successfully')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive() {
    setError(null)
    setSuccess(null)
    setToggling(true)

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update status')
      }

      setSuccess(isActive ? 'User deactivated' : 'User reactivated')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Edit details */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 max-w-2xl">
        <h2 className="text-lg font-semibold text-slate-900">Edit User</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">{success}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">Role</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Deactivate / Reactivate */}
      {!isSelf && (
        <div className={`rounded-xl border p-6 max-w-2xl ${isActive ? 'border-red-200 bg-red-50/30' : 'border-green-200 bg-green-50/30'}`}>
          <h2 className={`text-lg font-semibold ${isActive ? 'text-red-900' : 'text-green-900'}`}>
            {isActive ? 'Deactivate User' : 'Reactivate User'}
          </h2>
          <p className={`text-sm mt-1 mb-4 ${isActive ? 'text-red-700' : 'text-green-700'}`}>
            {isActive
              ? 'This will disable the user\'s access to the platform. They will not be able to sign in.'
              : 'This will restore the user\'s access to the platform.'}
          </p>
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={toggling}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              isActive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {toggling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isActive ? (
              <PowerOff className="w-4 h-4" />
            ) : (
              <Power className="w-4 h-4" />
            )}
            {toggling ? 'Updating...' : isActive ? 'Deactivate User' : 'Reactivate User'}
          </button>
        </div>
      )}
    </div>
  )
}

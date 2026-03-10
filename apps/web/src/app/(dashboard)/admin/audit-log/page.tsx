'use client'

import { useEffect, useState, useCallback } from 'react'
import { Activity, CheckCircle, XCircle, Clock, Download, ChevronLeft, ChevronRight } from 'lucide-react'

interface ConnectorJob {
  id: string
  jobType: string
  status: string
  attemptCount: number
  maxAttempts: number
  payload: string | null
  result: string | null
  errorMessage: string | null
  scheduledAt: string
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

interface AuditResponse {
  logs: ConnectorJob[]
  total: number
  stats: { totalJobs: number; successJobs: number; failedJobs: number; pendingJobs: number }
  jobTypes: string[]
}

const PAGE_SIZE = 30

const STATUS_BADGE: Record<string, string> = {
  COMPLETE: 'bg-green-50 text-green-700',
  FAILED:   'bg-red-50 text-red-700',
  RUNNING:  'bg-blue-50 text-blue-700',
  QUEUED:   'bg-amber-50 text-amber-700',
  RETRYING: 'bg-amber-50 text-amber-700',
}

function KpiCardInline({ label, value, sub, icon: Icon, variant = 'default' }: {
  label: string; value: number; sub: string; icon: React.ElementType; variant?: 'default' | 'success' | 'danger' | 'warning'
}) {
  const colors = {
    default: { bg: 'bg-teal-50', icon: 'text-teal-600' },
    success: { bg: 'bg-green-50', icon: 'text-green-600' },
    danger:  { bg: 'bg-red-50', icon: 'text-red-600' },
    warning: { bg: 'bg-amber-50', icon: 'text-amber-600' },
  }
  const c = colors[variant]
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  // Filters
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    if (statusFilter) params.set('status', statusFilter)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(page * PAGE_SIZE))

    try {
      const res = await fetch(`/api/admin/audit-logs?${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter, dateFrom, dateTo, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function handleFilter() {
    setPage(0)
    fetchLogs()
  }

  function handleClear() {
    setTypeFilter('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }

  function handleExport() {
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    if (statusFilter) params.set('status', statusFilter)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    window.open(`/api/admin/audit-logs/export?${params}`, '_blank')
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0
  const hasFilters = typeFilter || statusFilter || dateFrom || dateTo

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">System activity, connector jobs, and action history</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCardInline label="Total Actions" value={data?.stats.totalJobs ?? 0} sub="All system actions" icon={Activity} />
        <KpiCardInline label="Successful" value={data?.stats.successJobs ?? 0} sub="Completed without error" icon={CheckCircle} variant="success" />
        <KpiCardInline label="Failed" value={data?.stats.failedJobs ?? 0} sub="Needs review" icon={XCircle} variant={data?.stats.failedJobs ? 'danger' : 'default'} />
        <KpiCardInline label="Pending" value={data?.stats.pendingJobs ?? 0} sub="Queued or running" icon={Clock} variant={data?.stats.pendingJobs ? 'warning' : 'default'} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Action Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">All Types</option>
            {data?.jobTypes.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <button
          onClick={handleFilter}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          Apply
        </button>
        {hasFilters && (
          <button
            onClick={handleClear}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Timestamp</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Action Type</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Attempts</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Duration</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : !data?.logs.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No audit entries found.{hasFilters ? ' Try adjusting your filters.' : ''}
                </td>
              </tr>
            ) : data.logs.map((j) => {
              const duration = j.startedAt && j.completedAt
                ? `${((new Date(j.completedAt).getTime() - new Date(j.startedAt).getTime()) / 1000).toFixed(1)}s`
                : j.startedAt ? 'running...' : '-'

              return (
                <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(j.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {j.jobType.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[j.status] ?? 'bg-slate-50 text-slate-700'}`}>
                      {j.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {j.attemptCount}/{j.maxAttempts}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{duration}</td>
                  <td className="px-4 py-3 text-xs text-red-600 max-w-[250px] truncate">
                    {j.errorMessage ?? '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} of {data.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-sm text-slate-600">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

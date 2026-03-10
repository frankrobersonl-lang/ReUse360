'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Bell, CheckCheck, AlertTriangle, Wrench, Info,
  ChevronLeft, ChevronRight, ExternalLink, Check, Loader2,
} from 'lucide-react'

interface NotificationItem {
  id: string
  subject: string
  body: string
  severity: string
  channel: string
  readAt: string | null
  sentAt: string | null
  createdAt: string
  violationId: string | null
  violation: { id: string; caseNumber: string | null; violationType: string; status: string } | null
  account: { firstName: string | null; lastName: string | null; serviceAddress: string; accountId: string } | null
}

interface NotifResponse {
  notifications: NotificationItem[]
  total: number
  unreadCount: number
}

const PAGE_SIZE = 25

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-50 text-red-700',
  WARNING:  'bg-amber-50 text-amber-700',
  INFO:     'bg-blue-50 text-blue-700',
}

export default function NotificationsPage() {
  const [data, setData] = useState<NotifResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [page, setPage] = useState(0)

  // Filters
  const [typeFilter, setTypeFilter] = useState('')
  const [readFilter, setReadFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    if (readFilter) params.set('read', readFilter)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(page * PAGE_SIZE))

    try {
      const res = await fetch(`/api/notifications?${params}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [typeFilter, readFilter, dateFrom, dateTo, page])

  useEffect(() => { fetchData() }, [fetchData])

  async function markRead(id: string) {
    setData(prev => prev ? {
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    } : prev)
    await fetch('/api/notifications/mark-read', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    })
  }

  async function markAllRead() {
    setMarkingAll(true)
    await fetch('/api/notifications/mark-all-read', { method: 'POST' })
    await fetchData()
    setMarkingAll(false)
  }

  function handleFilter() {
    setPage(0)
  }

  function handleClear() {
    setTypeFilter('')
    setReadFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }

  function getIcon(n: NotificationItem) {
    if (n.violationId) return <AlertTriangle className="w-4 h-4 text-amber-500" />
    if (n.subject.toLowerCase().includes('service request')) return <Wrench className="w-4 h-4 text-blue-500" />
    return <Info className="w-4 h-4 text-slate-400" />
  }

  function getLink(n: NotificationItem): string | null {
    if (n.violation?.id) return `/enforcement/violations/${n.violation.id}`
    return null
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0
  const hasFilters = typeFilter || readFilter || dateFrom || dateTo

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            System alerts and violation notifications
            {data ? ` — ${data.unreadCount} unread` : ''}
          </p>
        </div>
        {data && data.unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {markingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
            Mark All Read
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
              <Bell className="w-4 h-4 text-teal-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{data?.total ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">All notifications</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unread</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{data?.unreadCount ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">Requires attention</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Read</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{(data?.total ?? 0) - (data?.unreadCount ?? 0)}</p>
          <p className="text-xs text-slate-400 mt-1">Acknowledged</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">All Types</option>
            <option value="violation">Violation</option>
            <option value="sr">Service Request</option>
            <option value="system">System</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
          <select
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">All</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
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

      {/* Notification list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-4">
              <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" />
            </div>
          ))
        ) : !data?.notifications.length ? (
          <div className="px-5 py-12 text-center">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              No notifications found.{hasFilters ? ' Try adjusting your filters.' : ''}
            </p>
          </div>
        ) : data.notifications.map((n) => {
          const link = getLink(n)
          return (
            <div
              key={n.id}
              className={`px-5 py-4 hover:bg-slate-50 transition-colors ${!n.readAt ? 'bg-teal-50/20' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 shrink-0">{getIcon(n)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-sm ${!n.readAt ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                      {n.subject}
                    </p>
                    {!n.readAt && <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ml-auto shrink-0 ${SEVERITY_BADGE[n.severity] ?? 'bg-slate-50 text-slate-600'}`}>
                      {n.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{n.body}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[11px] text-slate-400">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                    {n.violation?.caseNumber && (
                      <span className="text-[11px] text-slate-400">
                        Case: {n.violation.caseNumber}
                      </span>
                    )}
                    {n.account && (
                      <span className="text-[11px] text-slate-400 truncate max-w-48">
                        {n.account.serviceAddress}
                      </span>
                    )}
                    {link && (
                      <Link
                        href={link}
                        onClick={() => { if (!n.readAt) markRead(n.id) }}
                        className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 font-medium ml-auto"
                      >
                        View record <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                    {!n.readAt && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 ml-auto"
                      >
                        <Check className="w-3 h-3" /> Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Pagination */}
        {data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50">
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
              <span className="text-sm text-slate-600">Page {page + 1} of {totalPages}</span>
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

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Bell, Check, AlertTriangle, Wrench, Info, ExternalLink } from 'lucide-react'

interface NotificationItem {
  id: string
  subject: string
  body: string
  severity: string
  readAt: string | null
  createdAt: string
  violationId: string | null
  violation: { id: string; caseNumber: string | null; violationType: string; status: string } | null
  account: { firstName: string | null; lastName: string | null; serviceAddress: string } | null
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (res.ok) {
        const data = await res.json()
        setItems(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch { /* ignore */ }
  }, [])

  // Initial fetch + poll every 30s
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function markRead(id: string) {
    setItems(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    await fetch('/api/notifications/mark-read', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    })
  }

  async function markAllRead() {
    setLoading(true)
    await fetch('/api/notifications/mark-all-read', { method: 'POST' })
    setItems(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
    setUnreadCount(0)
    setLoading(false)
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

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                No notifications yet
              </div>
            ) : items.map((n) => {
              const link = getLink(n)
              return (
                <div
                  key={n.id}
                  className={`px-4 py-3 hover:bg-slate-50 transition-colors ${!n.readAt ? 'bg-teal-50/30' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{getIcon(n)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${!n.readAt ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                          {n.subject}
                        </p>
                        {!n.readAt && <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                        {link && (
                          <Link
                            href={link}
                            onClick={() => { if (!n.readAt) markRead(n.id); setOpen(false) }}
                            className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 font-medium"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        {!n.readAt && !link && (
                          <button
                            onClick={() => markRead(n.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700"
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
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2.5">
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-teal-600 hover:text-teal-700"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

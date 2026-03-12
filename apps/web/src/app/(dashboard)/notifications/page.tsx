'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Bell, AlertTriangle, ClipboardCheck, ShieldAlert,
  Monitor, ClipboardList, Check, CheckCheck,
} from 'lucide-react';

/* ── Types ─────────────────────────────────── */

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  VIOLATION_ALERT:    { icon: AlertTriangle,  color: 'text-amber-600 bg-amber-50',  label: 'Violation' },
  INSPECTION_DUE:     { icon: ClipboardCheck, color: 'text-blue-600 bg-blue-50',    label: 'Inspection' },
  COMPLIANCE_WARNING: { icon: ShieldAlert,    color: 'text-red-600 bg-red-50',      label: 'Compliance' },
  SYSTEM:             { icon: Monitor,        color: 'text-slate-600 bg-slate-100', label: 'System' },
  PATROL_REMINDER:    { icon: ClipboardList,  color: 'text-teal-600 bg-teal-50',   label: 'Patrol' },
};

const TABS = [
  { key: 'all',         label: 'All' },
  { key: 'unread',      label: 'Unread' },
  { key: 'violations',  label: 'Violations' },
  { key: 'inspections', label: 'Inspections' },
  { key: 'system',      label: 'System' },
] as const;

type TabKey = typeof TABS[number]['key'];

/* ── Component ──────────────────────────────── */

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('all');

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  async function markAsRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    await Promise.all(unread.map((n) => fetch(`/api/notifications/${n.id}`, { method: 'PATCH' })));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  }

  function handleClick(n: Notification) {
    if (!n.read) markAsRead(n.id);
    if (n.link) router.push(n.link);
  }

  // Filter
  const filtered = notifications.filter((n) => {
    if (tab === 'unread') return !n.read;
    if (tab === 'violations') return n.type === 'VIOLATION_ALERT' || n.type === 'COMPLIANCE_WARNING';
    if (tab === 'inspections') return n.type === 'INSPECTION_DUE';
    if (tab === 'system') return n.type === 'SYSTEM' || n.type === 'PATROL_REMINDER';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
              : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0 -mb-px">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                tab === t.key
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
              )}
            >
              {t.label}
              {t.key === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center">
          <Bell className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">
            {tab === 'unread' ? 'No unread notifications' : 'No notifications in this category'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-50">
          {filtered.map((n) => {
            const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.SYSTEM;
            const Icon = config.icon;
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'flex gap-4 px-5 py-4 transition-colors cursor-pointer',
                  !n.read ? 'bg-teal-50/30 hover:bg-teal-50/60' : 'hover:bg-slate-50/50',
                )}
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5', config.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm', n.read ? 'text-slate-600' : 'text-slate-900 font-semibold')}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                    )}
                    <span className={cn(
                      'ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
                      config.color,
                    )}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                    {!n.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                        className="text-[11px] text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Mark read
                      </button>
                    )}
                    {n.link && (
                      <span className="text-[11px] text-slate-400">Click to view →</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Helpers ──────────────────────────────── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

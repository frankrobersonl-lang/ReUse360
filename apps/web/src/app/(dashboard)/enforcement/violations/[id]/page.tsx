'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft, DollarSign, Clock, FileText, CalendarDays,
  AlertTriangle, MapPin, Hash, User, Droplets, Scale,
} from 'lucide-react';

/* ── Types ─────────────────────────────────── */

interface ViolationDetail {
  id: string;
  caseNumber: string | null;
  violationType: string;
  status: string;
  detectedAt: string;
  confirmedAt: string | null;
  resolvedAt: string | null;
  readValue: string;
  flowUnit: string | null;
  wateringDay: string | null;
  wateringZone: string | null;
  ordinanceRef: string | null;
  cityworksSrId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  account: {
    id: string;
    accountId: string;
    firstName: string;
    lastName: string;
    serviceAddress: string;
    isReclaimed: boolean;
    meterId: string;
  };
  inspections: { id: string; status: string; address: string; createdAt: string; findings: string | null }[];
  timeline: { date: string; event: string; detail: string }[];
  priorCount: number;
  offenseNumber: number;
  fineAmount: number;
  daysOpen: number;
  citationFees: { first: number; second: number; third: number };
}

/* ── Status Styles ──────────────────────────── */

const STATUS_STYLES: Record<string, string> = {
  DETECTED:   'bg-amber-50  text-amber-700  border-amber-200',
  CONFIRMED:  'bg-orange-50 text-orange-700 border-orange-200',
  NOTIFIED:   'bg-blue-50   text-blue-700   border-blue-200',
  SR_CREATED: 'bg-purple-50 text-purple-700 border-purple-200',
  RESOLVED:   'bg-green-50  text-green-700  border-green-200',
  DISMISSED:  'bg-slate-50  text-slate-400  border-slate-200',
};

const TYPE_LABELS: Record<string, string> = {
  WRONG_DAY:             'Wrong Day',
  WRONG_TIME:            'Wrong Time',
  EXCESSIVE_USAGE:       'Excessive Usage',
  CONTINUOUS_FLOW:       'Continuous Flow',
  LEAK_DETECTED:         'Leak Detected',
  PROHIBITED_IRRIGATION: 'Prohibited Irrigation',
};

const TIMELINE_DOT_STYLES: Record<string, string> = {
  'Violation Detected':  'bg-amber-500',
  'Violation Confirmed': 'bg-orange-500',
  'Service Request Created': 'bg-purple-500',
  'Violation Resolved':  'bg-green-500',
  'Officer Note':        'bg-slate-400',
};

/* ── Component ──────────────────────────────── */

export default function ViolationCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [v, setV] = useState<ViolationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);

  useEffect(() => {
    fetch(`/api/violations/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setV(data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading case…</div>;
  }

  if (!v) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-slate-500 text-sm">Violation not found</p>
        <Link href="/enforcement/violations" className="text-sm text-teal-600 hover:text-teal-700">Back to Violations</Link>
      </div>
    );
  }

  const isTerminal = v.status === 'RESOLVED' || v.status === 'DISMISSED';

  async function updateStatus(targetStatus: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/violations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Status updated to ${targetStatus.replace(/_/g, ' ')}`);
      // Refetch
      const updated = await fetch(`/api/violations/${id}`);
      if (updated.ok) setV(await updated.json());
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update status');
    } finally {
      setBusy(false);
    }
  }

  async function downloadNotice() {
    setBusy(true);
    try {
      const res = await fetch(`/api/violations/${id}/notice`);
      if (!res.ok) throw new Error('Failed to generate notice');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'violation-notice.pdf';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Notice PDF downloaded');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to download notice');
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (!noteText.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/violations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: v!.status, notes: noteText.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Note added');
      setNoteText('');
      setShowNoteForm(false);
      // Refetch
      const updated = await fetch(`/api/violations/${id}`);
      if (updated.ok) setV(await updated.json());
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to add note');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/enforcement/violations" className="hover:text-teal-600 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />
          Violations
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{v.caseNumber ?? id.slice(0, 8)}</span>
      </div>

      {/* Case Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">
              {v.caseNumber ?? 'Pending Case Number'}
            </h1>
            <span className={cn('px-3 py-1 rounded-full text-xs font-bold border', STATUS_STYLES[v.status] ?? '')}>
              {v.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {TYPE_LABELS[v.violationType] ?? v.violationType} — Detected {new Date(v.detectedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile
          icon={DollarSign}
          label="Fine Amount"
          value={`$${v.fineAmount}`}
          sub={`${ordinal(v.offenseNumber)} offense`}
          variant="danger"
        />
        <KpiTile
          icon={Clock}
          label="Days Open"
          value={v.status === 'RESOLVED' ? '0' : String(v.daysOpen)}
          sub={v.status === 'RESOLVED' ? 'Case closed' : 'Since detection'}
          variant={v.daysOpen > 30 ? 'warning' : 'default'}
        />
        <KpiTile
          icon={FileText}
          label="Citation Count"
          value={String(v.offenseNumber)}
          sub={`of ${v.priorCount + 1} total for account`}
          variant="default"
        />
        <KpiTile
          icon={CalendarDays}
          label="Last Updated"
          value={new Date(v.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          sub={new Date(v.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          variant="default"
        />
      </div>

      {/* Fine Calculation Panel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Scale className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Fine Calculation — FAC 40D-22
          </p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: '1st Offense', amount: v.citationFees.first, active: v.offenseNumber === 1 },
              { label: '2nd Offense', amount: v.citationFees.second, active: v.offenseNumber === 2 },
              { label: '3rd+ Offense', amount: v.citationFees.third, active: v.offenseNumber >= 3 },
            ].map((tier) => (
              <div
                key={tier.label}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  tier.active
                    ? 'bg-red-50 border-red-200'
                    : 'bg-slate-50 border-slate-200',
                )}
              >
                <p className="text-xs font-semibold text-slate-500">{tier.label}</p>
                <p className={cn(
                  'text-xl font-bold tabular-nums mt-1',
                  tier.active ? 'text-red-700' : 'text-slate-400',
                )}>
                  ${tier.amount}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            This is the <span className="font-semibold">{ordinal(v.offenseNumber)} offense</span> for account {v.account.accountId}.
            Violation type: {TYPE_LABELS[v.violationType] ?? v.violationType}.
          </p>
        </div>
      </div>

      {/* Account Info Panel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Information</p>
          </div>
          <Link
            href={`/accounts/${v.account.id}`}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            View Account →
          </Link>
        </div>
        <dl className="divide-y divide-slate-50">
          {[
            { label: 'Customer', value: `${v.account.firstName} ${v.account.lastName}`, icon: User },
            { label: 'Address', value: v.account.serviceAddress, icon: MapPin },
            { label: 'Account #', value: v.account.accountId, icon: Hash },
            { label: 'Meter ID', value: v.account.meterId, icon: Droplets },
            { label: 'Service', value: v.account.isReclaimed ? 'Reclaimed Water' : 'Potable Water', icon: Droplets },
          ].map((row) => (
            <div key={row.label} className="flex items-center px-5 py-3 gap-4">
              <row.icon className="w-4 h-4 text-slate-300 shrink-0" />
              <dt className="w-28 shrink-0 text-xs font-semibold text-slate-500">{row.label}</dt>
              <dd className="text-sm text-slate-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Case Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Case Timeline</p>
        </div>
        <div className="p-5">
          {v.timeline.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No timeline events</p>
          ) : (
            <div className="relative pl-6 space-y-4">
              {/* Vertical line */}
              <div className="absolute left-[9px] top-1.5 bottom-1.5 w-px bg-slate-200" />
              {v.timeline.map((entry, i) => (
                <div key={i} className="relative flex gap-3">
                  <div className={cn(
                    'w-[18px] h-[18px] rounded-full border-2 border-white shrink-0 -ml-6 mt-0.5 z-10',
                    TIMELINE_DOT_STYLES[entry.event] ?? 'bg-teal-500',
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900">{entry.event}</p>
                      <span className="text-xs text-slate-400">
                        {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' '}
                        {new Date(entry.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{entry.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!isTerminal && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</p>
          <div className="flex flex-wrap gap-3">
            {v.status === 'DETECTED' && (
              <button
                onClick={() => updateStatus('CONFIRMED')}
                disabled={busy}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {busy ? 'Updating…' : 'Escalate — Confirm Violation'}
              </button>
            )}
            {v.status === 'CONFIRMED' && (
              <button
                onClick={() => updateStatus('NOTIFIED')}
                disabled={busy}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {busy ? 'Updating…' : 'Escalate — Send Notice'}
              </button>
            )}
            {(v.status === 'NOTIFIED' || v.status === 'SR_CREATED') && (
              <button
                onClick={() => updateStatus('RESOLVED')}
                disabled={busy}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {busy ? 'Updating…' : 'Resolve Case'}
              </button>
            )}
            <button
              onClick={downloadNotice}
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              Issue Citation
            </button>
            <button
              onClick={() => setShowNoteForm(!showNoteForm)}
              className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-sm font-medium text-slate-700 rounded-lg transition-colors"
            >
              Add Note
            </button>
            <button
              onClick={() => updateStatus('DISMISSED')}
              disabled={busy}
              className="px-4 py-2 bg-white border border-slate-200 hover:border-red-300 hover:text-red-600 text-sm font-medium text-slate-500 rounded-lg transition-colors disabled:opacity-50"
            >
              Dismiss
            </button>
          </div>

          {/* Note Form */}
          {showNoteForm && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a case note…"
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={addNote}
                  disabled={busy || !noteText.trim()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {busy ? 'Saving…' : 'Save Note'}
                </button>
                <button
                  onClick={() => { setShowNoteForm(false); setNoteText(''); }}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {v.status === 'RESOLVED' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-sm font-medium text-green-700">This case has been resolved.</p>
          {v.resolvedAt && (
            <p className="text-xs text-green-600 mt-1">
              Resolved on {new Date(v.resolvedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      )}

      {v.status === 'DISMISSED' && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-sm text-slate-400 italic">This case has been dismissed.</p>
        </div>
      )}
    </div>
  );
}

/* ── KPI Tile ─────────────────────────────── */

const TILE_VARIANTS = {
  default: { icon: 'bg-teal-50 text-teal-600',  border: 'border-slate-200' },
  warning: { icon: 'bg-amber-50 text-amber-600', border: 'border-amber-200' },
  danger:  { icon: 'bg-red-50 text-red-600',     border: 'border-red-200'   },
  success: { icon: 'bg-green-50 text-green-600', border: 'border-green-200' },
};

function KpiTile({ icon: Icon, label, value, sub, variant = 'default' }: {
  icon: React.ElementType; label: string; value: string; sub?: string; variant?: keyof typeof TILE_VARIANTS;
}) {
  const s = TILE_VARIANTS[variant];
  return (
    <div className={cn('bg-white rounded-xl border p-5 flex flex-col gap-3', s.border)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.icon)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────── */

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

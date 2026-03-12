'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, ClipboardCheck, Gift, ShieldAlert,
  ClipboardList, ArrowLeft, MapPin, Hash, Droplets,
} from 'lucide-react';

/* ── Types ─────────────────────────────────── */

interface AccountDetail {
  id: string;
  accountId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  serviceAddress: string;
  meterId: string;
  isReclaimed: boolean;
  isActive: boolean;
  reclaimedGallonsBaseline: string | null;
  reclaimedGallonsCurrent: string | null;
  createdAt: string;
  violations: Violation[];
  inspections: Inspection[];
  patrolLogs: PatrolLog[];
  incentives: Incentive[];
  stats: {
    totalViolations: number;
    openCases: number;
    inspectionsCompleted: number;
    incentivesApplied: number;
  };
}

interface Violation {
  id: string;
  caseNumber: string | null;
  violationType: string;
  status: string;
  detectedAt: string;
  resolvedAt: string | null;
  readValue: string;
  wateringDay: string | null;
  notes: string | null;
}

interface Inspection {
  id: string;
  status: string;
  address: string;
  scheduledDate: string | null;
  completedDate: string | null;
  findings: string | null;
  assignedTo: string | null;
}

interface PatrolLog {
  id: string;
  officerNames: string[];
  patrolDate: string;
  mileage: number;
  numberOfViolations: number;
  citationsIssued: number;
  warningsIssued: number;
  notes: string | null;
}

interface Incentive {
  id: string;
  type: string;
  status: string;
  amount: string;
  description: string | null;
  appliedAt: string;
  approvedAt: string | null;
  paidAt: string | null;
}

/* ── Status Styles ──────────────────────────── */

const VIOLATION_STYLES: Record<string, string> = {
  DETECTED:   'bg-amber-50  text-amber-700  border-amber-200',
  CONFIRMED:  'bg-orange-50 text-orange-700 border-orange-200',
  NOTIFIED:   'bg-blue-50   text-blue-700   border-blue-200',
  SR_CREATED: 'bg-purple-50 text-purple-700 border-purple-200',
  RESOLVED:   'bg-green-50  text-green-700  border-green-200',
  DISMISSED:  'bg-slate-50  text-slate-400  border-slate-200',
};

const INSPECTION_STYLES: Record<string, string> = {
  SCHEDULED:  'bg-blue-50   text-blue-700   border-blue-200',
  IN_PROGRESS:'bg-amber-50  text-amber-700  border-amber-200',
  COMPLETE:   'bg-green-50  text-green-700  border-green-200',
  CANCELLED:  'bg-slate-50  text-slate-400  border-slate-200',
  NO_ACCESS:  'bg-orange-50 text-orange-700 border-orange-200',
};

const INCENTIVE_STYLES: Record<string, string> = {
  PENDING:  'bg-amber-50  text-amber-700  border-amber-200',
  APPROVED: 'bg-blue-50   text-blue-700   border-blue-200',
  PAID:     'bg-green-50  text-green-700  border-green-200',
  DENIED:   'bg-red-50    text-red-700    border-red-200',
};

const TYPE_LABELS: Record<string, string> = {
  WRONG_DAY:             'Wrong Day',
  WRONG_TIME:            'Wrong Time',
  EXCESSIVE_USAGE:       'Excessive Usage',
  CONTINUOUS_FLOW:       'Continuous Flow',
  LEAK_DETECTED:         'Leak Detected',
  PROHIBITED_IRRIGATION: 'Prohibited Irrigation',
  CONVERSION_REBATE:     'Conversion Rebate',
  USAGE_MILESTONE:       'Usage Milestone',
  COMPLIANCE_STREAK:     'Compliance Streak',
  OUTREACH_PARTICIPATION:'Outreach Participation',
};

const TABS = ['Overview', 'Violations', 'Inspections', 'Patrol Logs', 'Incentives'] as const;
type Tab = typeof TABS[number];

/* ── Component ──────────────────────────────── */

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('Overview');

  useEffect(() => {
    fetch(`/api/accounts/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAccount(data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Loading account…
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-slate-500 text-sm">Account not found</p>
        <Link href="/accounts" className="text-sm text-teal-600 hover:text-teal-700">
          Back to Accounts
        </Link>
      </div>
    );
  }

  const { stats } = account;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/accounts" className="hover:text-teal-600 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />
          Accounts
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{account.accountId}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {account.firstName} {account.lastName}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{account.serviceAddress}</span>
            <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{account.accountId}</span>
            <span className="flex items-center gap-1"><Droplets className="w-3.5 h-3.5" />{account.isReclaimed ? 'Reclaimed' : 'Potable'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'px-3 py-1 rounded-full text-xs font-bold border',
            account.isActive
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200',
          )}>
            {account.isActive ? 'Active' : 'Inactive'}
          </span>
          {account.isReclaimed && (
            <span className="px-3 py-1 rounded-full text-xs font-bold border bg-teal-50 text-teal-700 border-teal-200">
              Reclaimed
            </span>
          )}
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile icon={AlertTriangle} label="Total Violations" value={stats.totalViolations} variant={stats.totalViolations > 0 ? 'danger' : 'default'} />
        <KpiTile icon={ShieldAlert} label="Open Cases" value={stats.openCases} variant={stats.openCases > 0 ? 'warning' : 'default'} />
        <KpiTile icon={ClipboardCheck} label="Inspections Completed" value={stats.inspectionsCompleted} variant="success" />
        <KpiTile icon={Gift} label="Incentives Applied" value={stats.incentivesApplied} variant="success" />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/analyst/analytics/reclaimed"
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Gift className="w-4 h-4" />
          Apply Incentive
        </Link>
        <Link
          href="/enforcement/patrol-log"
          className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-sm font-medium text-slate-700 rounded-lg transition-colors"
        >
          New Inspection
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0 -mb-px">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                tab === t
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'Overview' && <OverviewTab account={account} />}
      {tab === 'Violations' && <ViolationsTab violations={account.violations} />}
      {tab === 'Inspections' && <InspectionsTab inspections={account.inspections} />}
      {tab === 'Patrol Logs' && <PatrolLogsTab logs={account.patrolLogs} />}
      {tab === 'Incentives' && <IncentivesTab incentives={account.incentives} />}
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

function KpiTile({ icon: Icon, label, value, variant = 'default' }: {
  icon: React.ElementType; label: string; value: number; variant?: keyof typeof TILE_VARIANTS;
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
      <p className="text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

/* ── Overview Tab ─────────────────────────── */

function OverviewTab({ account }: { account: AccountDetail }) {
  const rows = [
    { label: 'Account ID', value: account.accountId },
    { label: 'Meter ID', value: account.meterId },
    { label: 'Service Address', value: account.serviceAddress },
    { label: 'Email', value: account.email ?? '—' },
    { label: 'Phone', value: account.phone ?? '—' },
    { label: 'Service Type', value: account.isReclaimed ? 'Reclaimed Water' : 'Potable Water' },
    { label: 'Baseline (gal)', value: account.reclaimedGallonsBaseline ? Number(account.reclaimedGallonsBaseline).toLocaleString() : '—' },
    { label: 'Current (gal)', value: account.reclaimedGallonsCurrent ? Number(account.reclaimedGallonsCurrent).toLocaleString() : '—' },
    { label: 'Account Since', value: new Date(account.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Details</p>
      </div>
      <dl className="divide-y divide-slate-50">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center px-5 py-3 gap-4">
            <dt className="w-40 shrink-0 text-xs font-semibold text-slate-500">{row.label}</dt>
            <dd className="text-sm text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ── Violations Tab ───────────────────────── */

function ViolationsTab({ violations }: { violations: Violation[] }) {
  if (violations.length === 0) {
    return <EmptyState message="No violations recorded for this account" />;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Case</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Detected</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Read Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {violations.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3 font-mono text-sm text-slate-700">{v.caseNumber ?? '—'}</td>
                <td className="px-5 py-3 text-slate-700">{TYPE_LABELS[v.violationType] ?? v.violationType}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={v.status} styles={VIOLATION_STYLES} />
                </td>
                <td className="px-5 py-3 text-slate-600">{new Date(v.detectedAt).toLocaleDateString()}</td>
                <td className="px-5 py-3 tabular-nums text-slate-600">{Number(v.readValue).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Inspections Tab ──────────────────────── */

function InspectionsTab({ inspections }: { inspections: Inspection[] }) {
  if (inspections.length === 0) {
    return <EmptyState message="No inspections for this account" />;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Findings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {inspections.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3 text-slate-700">{i.address}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={i.status} styles={INSPECTION_STYLES} />
                </td>
                <td className="px-5 py-3 text-slate-600">{i.scheduledDate ? new Date(i.scheduledDate).toLocaleDateString() : '—'}</td>
                <td className="px-5 py-3 text-slate-600">{i.completedDate ? new Date(i.completedDate).toLocaleDateString() : '—'}</td>
                <td className="px-5 py-3 text-slate-600 max-w-xs truncate">{i.findings ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Patrol Logs Tab ──────────────────────── */

function PatrolLogsTab({ logs }: { logs: PatrolLog[] }) {
  if (logs.length === 0) {
    return <EmptyState message="No patrol logs available" />;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Officers</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Violations</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Citations</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Warnings</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3 text-slate-700">{new Date(l.patrolDate).toLocaleDateString()}</td>
                <td className="px-5 py-3 text-slate-700">{l.officerNames.join(', ') || '—'}</td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-600">{l.numberOfViolations}</td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-600">{l.citationsIssued}</td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-600">{l.warningsIssued}</td>
                <td className="px-5 py-3 text-slate-600 max-w-xs truncate">{l.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Incentives Tab ───────────────────────── */

function IncentivesTab({ incentives }: { incentives: Incentive[] }) {
  if (incentives.length === 0) {
    return <EmptyState message="No incentives applied to this account" />;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Applied</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {incentives.map((inc) => (
              <tr key={inc.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3 text-slate-700">{TYPE_LABELS[inc.type] ?? inc.type}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={inc.status} styles={INCENTIVE_STYLES} />
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-700 font-medium">
                  ${Number(inc.amount).toFixed(2)}
                </td>
                <td className="px-5 py-3 text-slate-600">{new Date(inc.appliedAt).toLocaleDateString()}</td>
                <td className="px-5 py-3 text-slate-600 max-w-xs truncate">{inc.description ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Shared Components ────────────────────── */

function StatusBadge({ status, styles }: { status: string; styles: Record<string, string> }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border', styles[status] ?? 'bg-slate-50 text-slate-500 border-slate-200')}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center text-slate-400 text-sm">
      {message}
    </div>
  );
}

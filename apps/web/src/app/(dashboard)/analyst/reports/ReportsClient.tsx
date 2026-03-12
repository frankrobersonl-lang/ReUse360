'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertTriangle, ClipboardList, Recycle, ShieldAlert,
  Download, Play, FileText, Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart, Bar, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

/* ── Report Definitions ────────────────────── */

interface ReportDef {
  key: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const REPORTS: ReportDef[] = [
  {
    key: 'violations',
    title: 'Violation Summary Report',
    description: 'Violations by type, status, and zone for a selected date range',
    icon: AlertTriangle,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    key: 'patrol',
    title: 'Patrol Activity Report',
    description: 'Patrol logs by officer, violations found, citations issued',
    icon: ClipboardList,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    key: 'reclaimed',
    title: 'Reclaimed Water Adoption Report',
    description: 'Accounts on reclaimed vs potable, conversion trends',
    icon: Recycle,
    color: 'text-teal-600 bg-teal-50',
  },
  {
    key: 'compliance',
    title: 'Compliance Rate Report',
    description: '% compliant accounts over time, warning vs violation breakdown',
    icon: ShieldAlert,
    color: 'text-green-600 bg-green-50',
  },
];

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

/* ── Main Component ────────────────────────── */

export function ReportsClient() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [dates, setDates] = useState<Record<string, { start: string; end: string }>>(
    Object.fromEntries(REPORTS.map((r) => [r.key, { start: thirtyDaysAgo, end: today }])),
  );
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const runReport = useCallback(async (key: string) => {
    const { start, end } = dates[key];
    if (!start || !end) { toast.error('Select a date range'); return; }
    setLoading((p) => ({ ...p, [key]: true }));
    try {
      const res = await fetch(`/api/reports?type=${key}&startDate=${start}&endDate=${end}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed');
      const json = await res.json();
      setResults((p) => ({ ...p, [key]: json }));
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to run report');
    } finally {
      setLoading((p) => ({ ...p, [key]: false }));
    }
  }, [dates]);

  function setDate(key: string, field: 'start' | 'end', value: string) {
    setDates((p) => ({ ...p, [key]: { ...p[key], [field]: value } }));
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Run operational reports — Pinellas County Utilities
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <FileText className="w-4 h-4" />
          <span>{REPORTS.length} reports available</span>
        </div>
      </div>

      {/* Report Cards */}
      {REPORTS.map((report) => (
        <ReportCard
          key={report.key}
          report={report}
          start={dates[report.key].start}
          end={dates[report.key].end}
          onStartChange={(v) => setDate(report.key, 'start', v)}
          onEndChange={(v) => setDate(report.key, 'end', v)}
          onRun={() => runReport(report.key)}
          loading={!!loading[report.key]}
          result={results[report.key]}
        />
      ))}
    </div>
  );
}

/* ── Report Card ───────────────────────────── */

function ReportCard({
  report, start, end, onStartChange, onEndChange, onRun, loading, result,
}: {
  report: ReportDef;
  start: string; end: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onRun: () => void;
  loading: boolean;
  result: any;
}) {
  const Icon = report.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', report.color)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{report.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{report.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={start}
              onChange={(e) => onStartChange(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={end}
              onChange={(e) => onEndChange(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            onClick={onRun}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            {loading ? 'Running…' : 'Run Report'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="border-t border-slate-100 p-5 space-y-5">
          {report.key === 'violations' && <ViolationResults data={result} />}
          {report.key === 'patrol' && <PatrolResults data={result} />}
          {report.key === 'reclaimed' && <ReclaimedResults data={result} />}
          {report.key === 'compliance' && <ComplianceResults data={result} />}
        </div>
      )}
    </div>
  );
}

/* ── Violation Results ─────────────────────── */

function ViolationResults({ data }: { data: any }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {data.total} violations found
        </p>
        <ExportCsvButton
          filename="violation-summary"
          headers={['Type', 'Count']}
          rows={data.byType.map((r: any) => [r.type, r.count])}
        />
      </div>

      {/* Trend chart */}
      {data.trend.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Weekly Trend</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(v: string) => {
                  const d = new Date(v + 'T00:00:00');
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} width={32} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} dot={{ r: 3, fill: '#0d9488' }} name="Violations" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By Type table */}
      <SummaryTable
        title="By Type"
        headers={['Violation Type', 'Count']}
        rows={data.byType.map((r: any) => [r.type, r.count])}
      />

      {/* By Status table */}
      <SummaryTable
        title="By Status"
        headers={['Status', 'Count']}
        rows={data.byStatus.map((r: any) => [r.status, r.count])}
      />

      {/* By Zone table */}
      {data.byZone.length > 0 && (
        <SummaryTable
          title="By Zone"
          headers={['Zone', 'Count']}
          rows={data.byZone.map((r: any) => [r.zone, r.count])}
        />
      )}
    </>
  );
}

/* ── Patrol Results ────────────────────────── */

function PatrolResults({ data }: { data: any }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-xs text-slate-500">
          <span><strong className="text-slate-900">{data.totalPatrols}</strong> patrols</span>
          <span><strong className="text-slate-900">{data.totalMileage}</strong> miles</span>
          <span><strong className="text-slate-900">{data.totalViolations}</strong> violations</span>
          <span><strong className="text-slate-900">{data.totalCitations}</strong> citations</span>
        </div>
        <ExportCsvButton
          filename="patrol-activity"
          headers={['Officer', 'Patrols', 'Violations', 'Citations', 'Warnings']}
          rows={data.byOfficer.map((r: any) => [r.officer, r.patrols, r.violations, r.citations, r.warnings])}
        />
      </div>

      {/* Trend chart */}
      {data.trend.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Daily Activity</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(v: string) => {
                  const d = new Date(v + 'T00:00:00');
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} width={32} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Bar dataKey="patrols" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={28} name="Patrols" />
              <Bar dataKey="violations" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} name="Violations" />
              <Bar dataKey="citations" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} name="Citations" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By Officer table */}
      <SummaryTable
        title="By Officer"
        headers={['Officer', 'Patrols', 'Violations', 'Citations', 'Warnings']}
        rows={data.byOfficer.map((r: any) => [r.officer, r.patrols, r.violations, r.citations, r.warnings])}
      />
    </>
  );
}

/* ── Reclaimed Results ─────────────────────── */

function ReclaimedResults({ data }: { data: any }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-xs text-slate-500">
          <span><strong className="text-slate-900">{data.reclaimedAccounts}</strong> reclaimed</span>
          <span><strong className="text-slate-900">{data.potableAccounts}</strong> potable</span>
          <span><strong className="text-slate-900">{data.adoptionRate}%</strong> adoption rate</span>
        </div>
        <ExportCsvButton
          filename="reclaimed-adoption"
          headers={['Service Type', 'Accounts']}
          rows={data.split.map((r: any) => [r.name, r.value])}
        />
      </div>

      {/* Split bar chart */}
      <div>
        <p className="text-xs font-medium text-slate-600 mb-2">Service Type Split</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.split} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} width={40} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={60} name="Accounts" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion trend */}
      {data.conversionTrend.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Monthly Conversions</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.conversionTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} width={32} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="conversions" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={40} name="Conversions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <SummaryTable
        title="Breakdown"
        headers={['Service Type', 'Accounts']}
        rows={data.split.map((r: any) => [r.name, r.value])}
      />
    </>
  );
}

/* ── Compliance Results ────────────────────── */

function ComplianceResults({ data }: { data: any }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-xs text-slate-500">
          <span><strong className="text-slate-900">{data.compliancePercent}%</strong> compliant</span>
          <span><strong className="text-slate-900">{data.warningCount}</strong> warnings</span>
          <span><strong className="text-slate-900">{data.violationCount}</strong> violations</span>
        </div>
        <ExportCsvButton
          filename="compliance-rate"
          headers={['Category', 'Accounts']}
          rows={data.breakdown.map((r: any) => [r.name, r.value])}
        />
      </div>

      {/* Compliance trend */}
      {data.trend.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Weekly Compliance Rate</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(v: string) => {
                  const d = new Date(v + 'T00:00:00');
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                domain={[0, 100]}
                width={40}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number, name: string) =>
                  name === 'complianceRate' ? [`${value}%`, 'Compliance'] : [value, 'Violations']
                }
              />
              <Legend />
              <Line type="monotone" dataKey="complianceRate" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} name="Compliance %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Breakdown bar */}
      <div>
        <p className="text-xs font-medium text-slate-600 mb-2">Account Breakdown</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.breakdown} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} width={40} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60} name="Accounts">
              {data.breakdown.map((entry: any, i: number) => {
                const colors: Record<string, string> = { Compliant: '#22c55e', Warning: '#f59e0b', Violation: '#ef4444' };
                return <Cell key={i} fill={colors[entry.name] ?? '#64748b'} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <SummaryTable
        title="Breakdown"
        headers={['Category', 'Accounts']}
        rows={data.breakdown.map((r: any) => [r.name, r.value])}
      />
    </>
  );
}

/* ── Shared: Summary Table ─────────────────── */

function SummaryTable({ title, headers, rows }: { title: string; headers: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-slate-600 mb-2">{title}</p>
      <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {headers.map((h) => (
                <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className={cn('px-4 py-2 text-sm', j === 0 ? 'text-slate-900 font-medium' : 'text-slate-600 tabular-nums')}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Shared: Export CSV ────────────────────── */

function ExportCsvButton({ filename, headers, rows }: { filename: string; headers: string[]; rows: (string | number)[][] }) {
  function handleExport() {
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-600 rounded-lg transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      Export CSV
    </button>
  );
}

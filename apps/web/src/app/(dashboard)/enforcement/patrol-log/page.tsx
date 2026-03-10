'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useReUse360Auth } from '@/lib/auth.client';
import { FileDown, AlertTriangle, FileText, MapPin, Car } from 'lucide-react';

const OFFICERS = [
  'Franklin Roberson',
  'Ian Schollenberger',
  'Chynna Courtney Cherry',
];

const WATER_SOURCES = ['Reclaimed', 'Potable', 'Well/Lake/Pond'];

// ── Types ─────────────────────────────────────

interface PatrolLogRecord {
  id: string;
  officerNames: string[];
  patrolDate: string;
  shiftStart: string | null;
  shiftEnd: string | null;
  mileage: number;
  numberOfViolations: number;
  citationsIssued: number;
  warningsIssued: number;
  waterSource: string | null;
  notes: string | null;
}

interface Stats {
  totalRecords: number;
  totalMiles: number;
  totalViolations: number;
  totalCitations: number;
  totalWarnings: number;
}

// ── Page ──────────────────────────────────────

export default function PatrolLogPage() {
  const router = useRouter();
  const { user } = useUser();
  const { role } = useReUse360Auth();
  const isAdmin = role === 'ADMIN';

  // ── Form state ────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    officerNames: [] as string[],
    patrolDate: new Date().toISOString().split('T')[0],
    shiftStart: '',
    shiftEnd: '',
    mileage: '',
    violationOccurred: false,
    numberOfViolations: '',
    citationsIssued: '',
    warningsIssued: '',
    outreachConducted: false,
    waterSource: '',
    notes: '',
  });

  // ── History state ─────────────────────────
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [officer, setOfficer] = useState('');
  const [logs, setLogs] = useState<PatrolLogRecord[]>([]);
  const [stats, setStats] = useState<Stats>({ totalRecords: 0, totalMiles: 0, totalViolations: 0, totalCitations: 0, totalWarnings: 0 });
  const [loading, setLoading] = useState(true);
  const [knownOfficers, setKnownOfficers] = useState<string[]>([]);

  // ── Fetch logs ────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (officer) params.set('officer', officer);
    params.set('limit', '200');

    try {
      const res = await fetch(`/api/patrol-logs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setLogs(data.logs ?? []);
      setStats(data.stats ?? { totalRecords: 0, totalMiles: 0, totalViolations: 0, totalCitations: 0, totalWarnings: 0 });

      // Build officer list from returned data
      const names = new Set<string>();
      (data.logs as PatrolLogRecord[]).forEach((l) => l.officerNames.forEach((n) => names.add(n)));
      setKnownOfficers((prev) => {
        const merged = new Set([...prev, ...names]);
        return Array.from(merged).sort();
      });
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, officer]);

  // Seed officer dropdown on mount
  useEffect(() => {
    fetch('/api/patrol-logs?limit=500')
      .then((r) => r.json())
      .then((data) => {
        const names = new Set<string>();
        ((data.logs ?? []) as PatrolLogRecord[]).forEach((l) => l.officerNames.forEach((n) => names.add(n)));
        setKnownOfficers(Array.from(names).sort());
      })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Refresh history after submit
  useEffect(() => { if (submitted) fetchLogs(); }, [submitted, fetchLogs]);

  // ── Form handlers ─────────────────────────
  function toggle(o: string) {
    setForm((f) => ({
      ...f,
      officerNames: f.officerNames.includes(o) ? f.officerNames.filter((x) => x !== o) : [...f.officerNames, o],
    }));
  }

  async function handleSubmit() {
    if (form.officerNames.length === 0) return alert('Select at least one officer.');
    if (!form.patrolDate) return alert('Patrol date is required.');
    setSubmitting(true);
    try {
      const res = await fetch('/api/patrol-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          mileage: Math.max(0, parseFloat(form.mileage) || 0),
          numberOfViolations: Math.max(0, parseInt(form.numberOfViolations) || 0),
          citationsIssued: Math.max(0, parseInt(form.citationsIssued) || 0),
          warningsIssued: Math.max(0, parseInt(form.warningsIssued) || 0),
        }),
      });
      if (!res.ok) throw new Error('Failed to submit');
      setSubmitted(true);
      // Reset form
      setForm({
        officerNames: [], patrolDate: new Date().toISOString().split('T')[0],
        shiftStart: '', shiftEnd: '', mileage: '', violationOccurred: false,
        numberOfViolations: '', citationsIssued: '', warningsIssued: '',
        outreachConducted: false, waterSource: '', notes: '',
      });
      setTimeout(() => setSubmitted(false), 3000);
    } catch {
      alert('Error submitting patrol log. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (officer) params.set('officer', officer);
    window.location.href = `/api/patrol-logs/export?${params}`;
  }

  // ── Render ────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Patrol Log</h1>
        <p className="text-sm text-slate-500">Submit shifts and review patrol history</p>
      </div>

      {/* ═══════════════════════════════════════
          SECTION 1: SUBMIT NEW SHIFT
         ═══════════════════════════════════════ */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Log New Shift</h2>

        {submitted && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Patrol log submitted successfully.
          </div>
        )}

        <div className="max-w-lg space-y-4">
          {/* Officers */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm">Officer(s) on Patrol</h3>
            <div className="space-y-2">
              {OFFICERS.map((o) => (
                <label key={o} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.officerNames.includes(o)} onChange={() => toggle(o)} className="w-5 h-5 accent-teal-600" />
                  <span className="text-slate-700 text-sm">{o}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date & Shift */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm">Date & Shift</h3>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide">Patrol Date</label>
              <input type="date" value={form.patrolDate} onChange={(e) => setForm((f) => ({ ...f, patrolDate: e.target.value }))}
                className="mt-1 w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide">Shift Start</label>
                <input type="time" value={form.shiftStart} onChange={(e) => setForm((f) => ({ ...f, shiftStart: e.target.value }))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide">Shift End</label>
                <input type="time" value={form.shiftEnd} onChange={(e) => setForm((f) => ({ ...f, shiftEnd: e.target.value }))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide">Mileage</label>
              <input type="number" placeholder="0" min="0" value={form.mileage} onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))}
                className="mt-1 w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>

          {/* Violations & Outreach */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm">Violations & Outreach</h3>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-700">Violation Occurred?</span>
              <div onClick={() => setForm((f) => ({ ...f, violationOccurred: !f.violationOccurred }))}
                className={`w-11 h-6 rounded-full transition-colors ${form.violationOccurred ? 'bg-teal-600' : 'bg-slate-200'}`}>
                <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${form.violationOccurred ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </label>
            {form.violationOccurred && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide"># Violations</label>
                  <input type="number" placeholder="0" min="0" value={form.numberOfViolations} onChange={(e) => setForm((f) => ({ ...f, numberOfViolations: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide">Citations</label>
                  <input type="number" placeholder="0" min="0" value={form.citationsIssued} onChange={(e) => setForm((f) => ({ ...f, citationsIssued: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide">Warnings</label>
                  <input type="number" placeholder="0" min="0" value={form.warningsIssued} onChange={(e) => setForm((f) => ({ ...f, warningsIssued: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
            )}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-700">Outreach Conducted?</span>
              <div onClick={() => setForm((f) => ({ ...f, outreachConducted: !f.outreachConducted }))}
                className={`w-11 h-6 rounded-full transition-colors ${form.outreachConducted ? 'bg-teal-600' : 'bg-slate-200'}`}>
                <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${form.outreachConducted ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </label>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide">Water Source</label>
              <select value={form.waterSource} onChange={(e) => setForm((f) => ({ ...f, waterSource: e.target.value }))}
                className="mt-1 w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Select source...</option>
                {WATER_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-700 mb-2 text-sm">Shift Notes</h3>
            <textarea rows={3} placeholder="Describe patrol activity, observations, training conducted..." value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-semibold shadow-sm transition-colors disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit Patrol Log'}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          SECTION 2: PATROL LOG HISTORY
         ═══════════════════════════════════════ */}
      <div className="border-t border-slate-200 pt-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Patrol Log History</h2>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Officer</label>
              <select value={officer} onChange={(e) => setOfficer(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[180px]">
                <option value="">All Officers</option>
                {knownOfficers.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          {isAdmin && (
            <button onClick={handleExport} disabled={stats.totalRecords === 0}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <FileDown className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <StatCard label="Total Records" value={stats.totalRecords} icon={<FileText className="w-4 h-4" />} />
          <StatCard label="Total Miles" value={Math.round(stats.totalMiles)} icon={<MapPin className="w-4 h-4" />} />
          <StatCard label="Violations Observed" value={stats.totalViolations} icon={<AlertTriangle className="w-4 h-4" />} warn={stats.totalViolations > 0} />
          <StatCard label="Citations Issued" value={stats.totalCitations} icon={<FileDown className="w-4 h-4" />} />
          <StatCard label="Warnings Issued" value={stats.totalWarnings} icon={<Car className="w-4 h-4" />} />
        </div>

        {/* History table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Officer(s)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Miles</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Violations</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Citations</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Warnings</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">Loading patrol logs...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">No patrol logs found for this period.</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-slate-900 whitespace-nowrap tabular-nums">
                      {new Date(log.patrolDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{log.officerNames.join(', ')}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap tabular-nums">
                      {log.shiftStart && log.shiftEnd ? `${log.shiftStart} – ${log.shiftEnd}` : log.shiftStart || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 tabular-nums">{log.mileage}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={log.numberOfViolations > 0 ? 'text-amber-700 font-medium' : 'text-slate-400'}>{log.numberOfViolations}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={log.citationsIssued > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}>{log.citationsIssued}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={log.warningsIssued > 0 ? 'text-orange-600 font-medium' : 'text-slate-400'}>{log.warningsIssued}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{log.waterSource ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={log.notes ?? ''}>{log.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, warn }: { label: string; value: number; icon: React.ReactNode; warn?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${warn ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>
        {icon}
      </div>
      <div>
        <p className="text-base font-bold text-slate-900 tabular-nums">{value.toLocaleString()}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReUse360Auth } from '@/lib/auth.client';
import { Car, FileDown, AlertTriangle, FileText, MapPin } from 'lucide-react';

interface PatrolLog {
  id: string;
  officerNames: string[];
  patrolDate: string;
  shiftStart: string | null;
  shiftEnd: string | null;
  mileage: number;
  numberOfViolations: number;
  citationsIssued: number;
  warningsIssued: number;
  violationOccurred: boolean;
  outreachConducted: boolean;
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

export function PatrolLogHistory() {
  const { role } = useReUse360Auth();
  const isAdmin = role === 'ADMIN';

  // Default to current month
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [officer, setOfficer] = useState('');
  const [logs, setLogs] = useState<PatrolLog[]>([]);
  const [stats, setStats] = useState<Stats>({ totalRecords: 0, totalMiles: 0, totalViolations: 0, totalCitations: 0, totalWarnings: 0 });
  const [loading, setLoading] = useState(true);
  const [officers, setOfficers] = useState<string[]>([]);

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
      setLogs(data.logs);
      setStats(data.stats);

      // Extract unique officer names from all logs for the dropdown
      const allNames = new Set<string>();
      (data.logs as PatrolLog[]).forEach((l) => l.officerNames.forEach((n) => allNames.add(n)));
      setOfficers((prev) => {
        const merged = new Set([...prev, ...allNames]);
        return Array.from(merged).sort();
      });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, officer]);

  // Fetch all officers on mount (unfiltered) to populate dropdown
  useEffect(() => {
    fetch('/api/patrol-logs?limit=500')
      .then((r) => r.json())
      .then((data) => {
        const allNames = new Set<string>();
        (data.logs as PatrolLog[]).forEach((l: PatrolLog) => l.officerNames.forEach((n: string) => allNames.add(n)));
        setOfficers(Array.from(allNames).sort());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function handleExport() {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (officer) params.set('officer', officer);
    window.location.href = `/api/patrol-logs/export?${params}`;
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Officer</label>
            <select
              value={officer}
              onChange={(e) => setOfficer(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[180px]"
            >
              <option value="">All Officers</option>
              {officers.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2 ml-auto">
            {isAdmin && (
              <button
                onClick={handleExport}
                disabled={stats.totalRecords === 0}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total Records" value={stats.totalRecords} icon={<FileText className="w-4 h-4" />} />
        <StatCard label="Total Miles" value={Math.round(stats.totalMiles)} icon={<MapPin className="w-4 h-4" />} />
        <StatCard label="Violations Observed" value={stats.totalViolations} icon={<AlertTriangle className="w-4 h-4" />} warn={stats.totalViolations > 0} />
        <StatCard label="Citations Issued" value={stats.totalCitations} icon={<FileDown className="w-4 h-4" />} />
        <StatCard label="Warnings Issued" value={stats.totalWarnings} icon={<Car className="w-4 h-4" />} />
      </div>

      {/* Table */}
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
                <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">No patrol logs found for this period.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 text-slate-900 whitespace-nowrap tabular-nums">
                    {new Date(log.patrolDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {log.officerNames.join(', ')}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap tabular-nums">
                    {log.shiftStart && log.shiftEnd ? `${log.shiftStart} – ${log.shiftEnd}` : log.shiftStart || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 tabular-nums">{log.mileage}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={log.numberOfViolations > 0 ? 'text-amber-700 font-medium' : 'text-slate-400'}>
                      {log.numberOfViolations}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={log.citationsIssued > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}>
                      {log.citationsIssued}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={log.warningsIssued > 0 ? 'text-orange-600 font-medium' : 'text-slate-400'}>
                      {log.warningsIssued}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{log.waterSource ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={log.notes ?? ''}>
                    {log.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, warn }: { label: string; value: number; icon: React.ReactNode; warn?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${warn ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold text-slate-900 tabular-nums">{value.toLocaleString()}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

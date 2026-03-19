'use client';

import { useUser } from '@clerk/nextjs';
import { useState } from 'react';
import { PatrolLogHistory } from '@/components/enforcement/PatrolLogHistory';

const WATER_SOURCES = ['Reclaimed', 'Potable', 'Well', 'Unknown'];
const OUTREACH_TYPES = [
  'Watering Schedule Pamphlet (3-tier)',
  'Door Hanger',
  'Verbal Education',
  'Written Warning',
  'Citation Issued',
];

export default function PatrolLogPage() {
  const { user } = useUser();
  const officerName = user?.fullName ?? user?.firstName ?? 'Officer';
  const today = new Date().toISOString().split('T')[0];

  const blank = {
    patrolDate: today,
    officerNames: officerName,
    shiftStart: '',
    shiftEnd: '',
    vehicleId: '',
    startOdometer: '',
    endOdometer: '',
    numberOfViolations: 0,
    citationsIssued: 0,
    warningsIssued: 0,
    violationOccurred: false,
    outreachConducted: false,
    outreachType: '',
    pamphletCount: 0,
    residencesContacted: 0,
    waterSource: '',
    notes: '',
  };

  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const totalMiles =
    form.startOdometer && form.endOdometer
      ? Math.max(0, Number(form.endOdometer) - Number(form.startOdometer))
      : 0;

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/patrol-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          officerNames: form.officerNames.split(',').map((s) => s.trim()).filter(Boolean),
          totalMiles,
          mileage: totalMiles,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setSubmitted(true);
      setRefreshKey((k) => k + 1);
      setTimeout(() => { setSubmitted(false); setForm({ ...blank, officerNames: officerName }); }, 2500);
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Patrol Log</h1>
        <p className="text-slate-500 text-sm mt-1">Log field enforcement activity, mileage, and community outreach for SWFWMD reporting</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">

        {/* Date & Officers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Patrol Date *</label>
            <input type="date" required value={form.patrolDate}
              onChange={(e) => set('patrolDate', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Officer Name(s) *</label>
            <input type="text" required value={form.officerNames} placeholder="Separate multiple with commas"
              onChange={(e) => set('officerNames', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Shift & Vehicle */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Shift Start</label>
            <input type="time" value={form.shiftStart}
              onChange={(e) => set('shiftStart', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Shift End</label>
            <input type="time" value={form.shiftEnd}
              onChange={(e) => set('shiftEnd', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle ID / Unit #</label>
            <input type="text" value={form.vehicleId} placeholder="e.g. PCU-04"
              onChange={(e) => set('vehicleId', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Mile Tracker */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-blue-800 mb-3">🚗 Mile Tracker</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Start Odometer</label>
              <input type="number" min="0" value={form.startOdometer} placeholder="e.g. 45230"
                onChange={(e) => set('startOdometer', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">End Odometer</label>
              <input type="number" min="0" value={form.endOdometer} placeholder="e.g. 45274"
                onChange={(e) => set('endOdometer', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Total Miles (Auto-calculated)</label>
              <div className="w-full border border-blue-300 bg-blue-100 rounded-lg px-3 py-2 text-sm font-bold text-blue-800">
                {totalMiles > 0 ? totalMiles.toFixed(1) + ' miles' : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Enforcement */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3">Enforcement Activity</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              ['Violations Observed', 'numberOfViolations'],
              ['Citations Issued', 'citationsIssued'],
              ['Warnings Issued', 'warningsIssued'],
            ] as [string, string][]).map(([label, field]) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                <input type="number" min="0" value={(form as Record<string, unknown>)[field] as number}
                  onChange={(e) => set(field, parseInt(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Water Source</label>
              <select value={form.waterSource} onChange={(e) => set('waterSource', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select...</option>
                {WATER_SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Outreach */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-green-800 mb-3">📋 Community Outreach</h3>
          <div className="flex items-center gap-2 mb-4">
            <input type="checkbox" id="outreachConducted" checked={form.outreachConducted}
              onChange={(e) => set('outreachConducted', e.target.checked)}
              className="w-4 h-4 text-green-600 rounded" />
            <label htmlFor="outreachConducted" className="text-sm font-medium text-slate-700">
              Outreach conducted during this patrol
            </label>
          </div>
          {form.outreachConducted && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Outreach Type</label>
                <select value={form.outreachType} onChange={(e) => set('outreachType', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select type...</option>
                  {OUTREACH_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pamphlets Distributed</label>
                <input type="number" min="0" value={form.pamphletCount}
                  onChange={(e) => set('pamphletCount', parseInt(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Residences Contacted</label>
                <input type="number" min="0" value={form.residencesContacted}
                  onChange={(e) => set('residencesContacted', parseInt(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
          <textarea rows={3} value={form.notes} placeholder="Additional observations..."
            onChange={(e) => set('notes', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" disabled={submitting || submitted}
          className={'w-full py-3 rounded-xl font-semibold text-sm transition-colors ' + (
            submitted ? 'bg-green-500 text-white' :
            submitting ? 'bg-blue-400 text-white cursor-wait' :
            'bg-blue-600 hover:bg-blue-700 text-white'
          )}>
          {submitted ? '✓ Patrol Log Submitted' : submitting ? 'Submitting...' : 'Submit Patrol Log'}
        </button>
      </form>

      <PatrolLogHistory key={refreshKey} />
    </div>
  );
}

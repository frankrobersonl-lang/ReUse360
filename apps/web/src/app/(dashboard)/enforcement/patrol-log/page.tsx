'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { PatrolLogHistory } from '@/components/enforcement/PatrolLogHistory';
import { cn } from '@/lib/utils';

const OFFICERS = [
  'Franklin Roberson',
  'Ian Schollenberger',
  'Chynna Courtney Cherry',
];

const WATER_SOURCES = ['Reclaimed', 'Potable', 'Well/Lake/Pond'];

export default function PatrolLogPage() {
  const router = useRouter();
  const { user } = useUser();
  const [tab, setTab] = useState<'form' | 'history'>('history');
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

  function toggle(officer: string) {
    setForm((f) => ({
      ...f,
      officerNames: f.officerNames.includes(officer)
        ? f.officerNames.filter((o) => o !== officer)
        : [...f.officerNames, officer],
    }));
  }

  function resetForm() {
    setSubmitted(false);
    setForm({
      officerNames: [],
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
    } catch {
      alert('Error submitting patrol log. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header + tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Patrol Log</h1>
          <p className="text-sm text-slate-500">Submit shifts and review patrol history</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setTab('history')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            tab === 'history'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          )}
        >
          History & Reports
        </button>
        <button
          onClick={() => { setTab('form'); setSubmitted(false); }}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            tab === 'form'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          )}
        >
          Log New Shift
        </button>
      </div>

      {/* Tab content */}
      {tab === 'history' && <PatrolLogHistory />}

      {tab === 'form' && (
        submitted ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Patrol Log Submitted</h2>
            <p className="text-slate-500 text-sm mb-6">Your shift has been recorded in ReUse360.</p>
            <button
              onClick={resetForm}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Log Another Shift
            </button>
            <button
              onClick={() => setTab('history')}
              className="w-full mt-3 text-slate-500 text-sm py-2 hover:text-slate-700"
            >
              View History
            </button>
          </div>
        ) : (
          <div className="max-w-lg space-y-5">
            {/* Officers */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-700 mb-3">Officer(s) on Patrol</h2>
              <div className="space-y-2">
                {OFFICERS.map((o) => (
                  <label key={o} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.officerNames.includes(o)}
                      onChange={() => toggle(o)}
                      className="w-5 h-5 accent-teal-600"
                    />
                    <span className="text-slate-700">{o}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date & Shift */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h2 className="font-semibold text-slate-700">Date & Shift</h2>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide">Patrol Date</label>
                <input
                  type="date"
                  value={form.patrolDate}
                  onChange={(e) => setForm((f) => ({ ...f, patrolDate: e.target.value }))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide">Shift Start</label>
                  <input
                    type="time"
                    value={form.shiftStart}
                    onChange={(e) => setForm((f) => ({ ...f, shiftStart: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wide">Shift End</label>
                  <input
                    type="time"
                    value={form.shiftEnd}
                    onChange={(e) => setForm((f) => ({ ...f, shiftEnd: e.target.value }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide">Mileage</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={form.mileage}
                  onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Violations */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h2 className="font-semibold text-slate-700">Violations & Outreach</h2>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700">Violation Occurred?</span>
                <div
                  onClick={() => setForm((f) => ({ ...f, violationOccurred: !f.violationOccurred }))}
                  className={`w-12 h-6 rounded-full transition-colors ${form.violationOccurred ? 'bg-teal-600' : 'bg-slate-200'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${form.violationOccurred ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </label>
              {form.violationOccurred && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide"># Violations</label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={form.numberOfViolations}
                      onChange={(e) => setForm((f) => ({ ...f, numberOfViolations: e.target.value }))}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide">Citations</label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={form.citationsIssued}
                      onChange={(e) => setForm((f) => ({ ...f, citationsIssued: e.target.value }))}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide">Warnings</label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={form.warningsIssued}
                      onChange={(e) => setForm((f) => ({ ...f, warningsIssued: e.target.value }))}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700">Outreach Conducted?</span>
                <div
                  onClick={() => setForm((f) => ({ ...f, outreachConducted: !f.outreachConducted }))}
                  className={`w-12 h-6 rounded-full transition-colors ${form.outreachConducted ? 'bg-teal-600' : 'bg-slate-200'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${form.outreachConducted ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </label>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide">Water Source</label>
                <select
                  value={form.waterSource}
                  onChange={(e) => setForm((f) => ({ ...f, waterSource: e.target.value }))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select source...</option>
                  {WATER_SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-700 mb-3">Shift Notes</h2>
              <textarea
                rows={4}
                placeholder="Describe patrol activity, observations, training conducted..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-xl font-semibold text-base shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Patrol Log'}
            </button>
          </div>
        )
      )}
    </div>
  );
}

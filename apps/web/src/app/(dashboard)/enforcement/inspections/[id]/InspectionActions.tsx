'use client';

import { useRouter } from 'next/navigation';
import { useState }  from 'react';
import { toast }     from 'sonner';
import { cn }        from '@/lib/utils';

/* ── Status transitions ────────────────────────────────── */

const STATUS_FLOW: Record<string, { label: string; target: string; color: string }[]> = {
  SCHEDULED:   [
    { label: 'Begin Inspection', target: 'IN_PROGRESS', color: 'bg-blue-600 hover:bg-blue-500' },
    { label: 'No Access',        target: 'NO_ACCESS',   color: 'bg-amber-600 hover:bg-amber-500' },
    { label: 'Cancel',           target: 'CANCELLED',   color: 'bg-slate-500 hover:bg-slate-400' },
  ],
  IN_PROGRESS: [
    { label: 'Mark Complete', target: 'COMPLETE',  color: 'bg-green-600 hover:bg-green-500' },
    { label: 'No Access',    target: 'NO_ACCESS',  color: 'bg-amber-600 hover:bg-amber-500' },
    { label: 'Cancel',       target: 'CANCELLED',  color: 'bg-slate-500 hover:bg-slate-400' },
  ],
  NO_ACCESS:   [
    { label: 'Reschedule', target: 'SCHEDULED', color: 'bg-teal-600 hover:bg-teal-500' },
    { label: 'Cancel',     target: 'CANCELLED', color: 'bg-slate-500 hover:bg-slate-400' },
  ],
};

interface Props {
  inspectionId: string;
  currentStatus: string;
  initialFindings: string;
}

export function InspectionActions({ inspectionId, currentStatus, initialFindings }: Props) {
  const router = useRouter();
  const [busy, setBusy]         = useState(false);
  const [findings, setFindings] = useState(initialFindings);
  const [saved, setSaved]       = useState(true);

  const actions = STATUS_FLOW[currentStatus];
  const isTerminal = currentStatus === 'COMPLETE' || currentStatus === 'CANCELLED';

  async function patchInspection(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/inspections/${inspectionId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Update failed');
      }
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Update failed';
      toast.error(msg);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange(target: string) {
    const ok = await patchInspection({ status: target });
    if (ok) {
      toast.success(`Status updated to ${target.replace(/_/g, ' ')}`);
      router.refresh();
    }
  }

  async function handleSaveFindings() {
    const ok = await patchInspection({ findings });
    if (ok) {
      toast.success('Findings saved');
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Inspector Notes / Findings ────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inspector Notes</p>
          {!saved && (
            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Unsaved</span>
          )}
        </div>
        <div className="p-5">
          <textarea
            value={findings}
            onChange={(e) => { setFindings(e.target.value); setSaved(false); }}
            disabled={busy || isTerminal}
            placeholder={isTerminal ? 'No edits allowed on completed/cancelled inspections.' : 'Enter inspection findings, observations, and notes…'}
            rows={5}
            className={cn(
              'w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors',
              'resize-y disabled:bg-slate-50 disabled:cursor-not-allowed',
            )}
          />
          {!isTerminal && (
            <div className="flex justify-end mt-3">
              <button
                onClick={handleSaveFindings}
                disabled={busy || saved}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {busy ? 'Saving…' : 'Save Notes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Status Actions ────────────────────────────── */}
      {actions && actions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</h3>
          <div className="flex flex-wrap gap-3">
            {actions.map((a) => (
              <button
                key={a.target}
                onClick={() => handleStatusChange(a.target)}
                disabled={busy}
                className={cn(
                  'px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50',
                  a.color,
                )}
              >
                {busy ? 'Updating…' : a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isTerminal && (
        <p className={cn(
          'text-sm font-medium',
          currentStatus === 'COMPLETE' ? 'text-green-600' : 'text-slate-400 italic',
        )}>
          {currentStatus === 'COMPLETE'
            ? 'This inspection has been completed.'
            : 'This inspection has been cancelled.'}
        </p>
      )}
    </div>
  );
}

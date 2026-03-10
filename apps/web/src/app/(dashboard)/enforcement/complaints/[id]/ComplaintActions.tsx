'use client';

import { useRouter } from 'next/navigation';
import { useState }  from 'react';
import { toast }     from 'sonner';
import { cn }        from '@/lib/utils';

const STATUS_FLOW: Record<string, { label: string; target: string; color: string }[]> = {
  OPEN: [
    { label: 'Start Investigation', target: 'INVESTIGATING', color: 'bg-blue-600 hover:bg-blue-500' },
    { label: 'Resolve',             target: 'RESOLVED',      color: 'bg-green-600 hover:bg-green-500' },
    { label: 'Mark Duplicate',      target: 'DUPLICATE',     color: 'bg-slate-500 hover:bg-slate-400' },
    { label: 'Mark Unfounded',      target: 'UNFOUNDED',     color: 'bg-slate-500 hover:bg-slate-400' },
  ],
  INVESTIGATING: [
    { label: 'Resolve',        target: 'RESOLVED',  color: 'bg-green-600 hover:bg-green-500' },
    { label: 'Mark Duplicate', target: 'DUPLICATE',  color: 'bg-slate-500 hover:bg-slate-400' },
    { label: 'Mark Unfounded', target: 'UNFOUNDED',  color: 'bg-slate-500 hover:bg-slate-400' },
  ],
};

interface Props {
  complaintId: string;
  currentStatus: string;
  initialResolution: string;
}

export function ComplaintActions({ complaintId, currentStatus, initialResolution }: Props) {
  const router = useRouter();
  const [busy, setBusy]             = useState(false);
  const [resolution, setResolution] = useState(initialResolution);
  const [saved, setSaved]           = useState(true);

  const actions = STATUS_FLOW[currentStatus];
  const isTerminal = currentStatus === 'RESOLVED' || currentStatus === 'DUPLICATE' || currentStatus === 'UNFOUNDED';

  async function patchComplaint(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
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
    // Include resolution notes when closing
    const body: Record<string, unknown> = { status: target };
    if ((target === 'RESOLVED' || target === 'DUPLICATE' || target === 'UNFOUNDED') && resolution.trim()) {
      body.resolution = resolution;
    }
    const ok = await patchComplaint(body);
    if (ok) {
      toast.success(`Complaint ${target.toLowerCase().replace(/_/g, ' ')}`);
      router.refresh();
    }
  }

  async function handleSaveResolution() {
    const ok = await patchComplaint({ resolution });
    if (ok) {
      toast.success('Resolution notes saved');
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Resolution Notes */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolution Notes</p>
          {!saved && (
            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Unsaved</span>
          )}
        </div>
        <div className="p-5">
          <textarea
            value={resolution}
            onChange={(e) => { setResolution(e.target.value); setSaved(false); }}
            disabled={busy || isTerminal}
            placeholder={isTerminal ? 'Complaint has been closed.' : 'Enter resolution notes, investigation findings…'}
            rows={4}
            className={cn(
              'w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors',
              'resize-y disabled:bg-slate-50 disabled:cursor-not-allowed',
            )}
          />
          {!isTerminal && (
            <div className="flex justify-end mt-3">
              <button
                onClick={handleSaveResolution}
                disabled={busy || saved}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {busy ? 'Saving…' : 'Save Notes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Actions */}
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
          currentStatus === 'RESOLVED' ? 'text-green-600' : 'text-slate-400 italic',
        )}>
          {currentStatus === 'RESOLVED' && 'This complaint has been resolved.'}
          {currentStatus === 'DUPLICATE' && 'This complaint was marked as a duplicate.'}
          {currentStatus === 'UNFOUNDED' && 'This complaint was marked as unfounded.'}
        </p>
      )}
    </div>
  );
}

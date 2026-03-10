'use client';

import { useRouter } from 'next/navigation';
import { useState }  from 'react';
import { toast }     from 'sonner';
import { cn }        from '@/lib/utils';

const STATUS_FLOW: Record<string, { label: string; target: string; color: string }[]> = {
  SUBMITTED: [
    { label: 'Begin Review',  target: 'UNDER_REVIEW', color: 'bg-blue-600 hover:bg-blue-500' },
    { label: 'Deny',          target: 'DENIED',       color: 'bg-red-600 hover:bg-red-500' },
  ],
  UNDER_REVIEW: [
    { label: 'Approve',       target: 'APPROVED',     color: 'bg-green-600 hover:bg-green-500' },
    { label: 'Deny',          target: 'DENIED',       color: 'bg-red-600 hover:bg-red-500' },
  ],
  APPROVED: [
    { label: 'Mark Expired',  target: 'EXPIRED',      color: 'bg-amber-600 hover:bg-amber-500' },
    { label: 'Revoke',        target: 'REVOKED',      color: 'bg-red-600 hover:bg-red-500' },
  ],
};

interface Props {
  permitId: string;
  currentStatus: string;
}

export function PermitActions({ permitId, currentStatus }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const actions = STATUS_FLOW[currentStatus];
  const isTerminal = currentStatus === 'DENIED' || currentStatus === 'EXPIRED' || currentStatus === 'REVOKED';

  async function handleStatusChange(target: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/permits/${permitId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: target }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Update failed');
      }
      toast.success(`Permit status updated to ${target.replace(/_/g, ' ')}`);
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Update failed';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</h3>

      {actions && actions.length > 0 && (
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
      )}

      {isTerminal && (
        <p className={cn(
          'text-sm font-medium',
          currentStatus === 'DENIED' ? 'text-red-600' :
          currentStatus === 'REVOKED' ? 'text-red-600' :
          'text-amber-600',
        )}>
          {currentStatus === 'DENIED' && 'This permit has been denied.'}
          {currentStatus === 'EXPIRED' && 'This permit has expired.'}
          {currentStatus === 'REVOKED' && 'This permit has been revoked.'}
        </p>
      )}
    </div>
  );
}

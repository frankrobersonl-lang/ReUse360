'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STEPS = ['DETECTED', 'CONFIRMED', 'NOTIFIED', 'SR_CREATED', 'RESOLVED'] as const
const STEP_LABELS: Record<string, string> = {
  DETECTED: 'Detected',
  CONFIRMED: 'Confirmed',
  NOTIFIED: 'Noticed',
  SR_CREATED: 'SR Created',
  RESOLVED: 'Resolved',
}

const NEXT_ACTIONS: Record<string, { label: string; target: string; color: string }> = {
  DETECTED:   { label: 'Confirm Violation', target: 'CONFIRMED', color: 'bg-orange-600 hover:bg-orange-500' },
  CONFIRMED:  { label: 'Send Notice',       target: 'NOTIFIED',  color: 'bg-blue-600 hover:bg-blue-500' },
  NOTIFIED:   { label: 'Mark Resolved',     target: 'RESOLVED',  color: 'bg-green-600 hover:bg-green-500' },
  SR_CREATED: { label: 'Mark Resolved',     target: 'RESOLVED',  color: 'bg-green-600 hover:bg-green-500' },
}

export function StatusProgression({ violationId, currentStatus }: { violationId: string; currentStatus: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const currentIdx = STEPS.indexOf(currentStatus as typeof STEPS[number])
  const nextAction = NEXT_ACTIONS[currentStatus]
  const isDismissed = currentStatus === 'DISMISSED'
  const isTerminal = currentStatus === 'RESOLVED' || isDismissed

  async function advance(targetStatus: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/violations/${violationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update status')
      }
      toast.success(`Status updated to ${STEP_LABELS[targetStatus] ?? targetStatus}`)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update')
    } finally {
      setBusy(false)
    }
  }

  async function dismiss() {
    setBusy(true)
    try {
      const res = await fetch(`/api/violations/${violationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISMISSED' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to dismiss')
      }
      toast.success('Violation dismissed')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to dismiss')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Progression</h3>

      {/* Progress steps */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const isPast = i < currentIdx
          const isCurrent = i === currentIdx && !isDismissed
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                  isCurrent ? 'bg-teal-600 border-teal-600 text-white' :
                  isPast ? 'bg-teal-100 border-teal-300 text-teal-700' :
                  'bg-slate-50 border-slate-200 text-slate-400',
                )}>
                  {isPast ? '\u2713' : i + 1}
                </div>
                <span className={cn(
                  'text-[10px] mt-1 font-medium text-center',
                  isCurrent ? 'text-teal-700' : isPast ? 'text-teal-600' : 'text-slate-400',
                )}>
                  {STEP_LABELS[step]}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  'h-0.5 flex-1 mx-1 mt-[-16px]',
                  i < currentIdx ? 'bg-teal-300' : 'bg-slate-200',
                )} />
              )}
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      {!isTerminal && (
        <div className="flex items-center gap-3 pt-2">
          {nextAction && (
            <button
              onClick={() => advance(nextAction.target)}
              disabled={busy}
              className={cn('px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50', nextAction.color)}
            >
              {busy ? 'Updating...' : nextAction.label}
            </button>
          )}
          <button
            onClick={dismiss}
            disabled={busy}
            className="px-4 py-2 bg-white border border-slate-200 hover:border-red-300 hover:text-red-600 text-sm font-medium text-slate-500 rounded-lg transition-colors disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      )}

      {isDismissed && (
        <p className="text-sm text-slate-400 italic">This violation has been dismissed.</p>
      )}
      {currentStatus === 'RESOLVED' && (
        <p className="text-sm text-green-600 font-medium">This violation has been resolved.</p>
      )}
    </div>
  )
}

'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { GenerateNoticeLink } from './GenerateNoticeLink';

const STATUS_STYLES: Record<string, string> = {
  DETECTED:   'bg-amber-50  text-amber-700  border-amber-200',
  CONFIRMED:  'bg-orange-50 text-orange-700 border-orange-200',
  NOTIFIED:   'bg-blue-50   text-blue-700   border-blue-200',
  SR_CREATED: 'bg-purple-50 text-purple-700 border-purple-200',
  RESOLVED:   'bg-green-50  text-green-700  border-green-200',
  DISMISSED:  'bg-slate-50  text-slate-400  border-slate-200',
};

const TYPE_LABELS: Record<string, string> = {
  WRONG_DAY:             'Wrong Day',
  WRONG_TIME:            'Wrong Time',
  EXCESSIVE_USAGE:       'Excessive Usage',
  CONTINUOUS_FLOW:       'Continuous Flow',
  LEAK_DETECTED:         'Leak Detected',
  PROHIBITED_IRRIGATION: 'Prohibited Irrigation',
};

export interface ViolationRow {
  id: string;
  caseNumber: string | null;
  violationType: string;
  status: string;
  detectedAt: string;
  account: {
    serviceAddress: string;
    firstName: string;
    lastName: string;
    accountId: string;
  };
}

export function ViolationsTable({ violations }: { violations: ViolationRow[] }) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Case #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Account</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Detected</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {violations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">
                  No violations match this filter
                </td>
              </tr>
            ) : violations.map(v => (
              <tr
                key={v.id}
                className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/enforcement/violations/${v.id}`)}
              >
                <td className="px-5 py-3 font-mono text-xs text-teal-700 font-medium whitespace-nowrap">
                  {v.caseNumber ?? '—'}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                  {v.account.serviceAddress}
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                  {v.account.firstName} {v.account.lastName}
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {TYPE_LABELS[v.violationType] ?? v.violationType}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border', STATUS_STYLES[v.status] ?? '')}>
                    {v.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap tabular-nums">
                  {new Date(v.detectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-3">
                    <GenerateNoticeLink violationId={v.id} />
                    <Link
                      href={`/enforcement/violations/${v.id}`}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View →
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

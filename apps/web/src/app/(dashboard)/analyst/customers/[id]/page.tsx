import { requireAnalyst } from '@/lib/auth.server';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ApplyIncentiveButton } from './ApplyIncentiveButton';

const STATUS_STYLES: Record<string, string> = {
  PENDING:  'bg-amber-50  text-amber-700  border-amber-200',
  APPROVED: 'bg-blue-50   text-blue-700   border-blue-200',
  PAID:     'bg-green-50  text-green-700  border-green-200',
  DENIED:   'bg-red-50    text-red-700    border-red-200',
};

const TYPE_LABELS: Record<string, string> = {
  CONVERSION_REBATE:       'Conversion Rebate',
  USAGE_MILESTONE:         'Usage Milestone',
  COMPLIANCE_STREAK:       'Compliance Streak',
  OUTREACH_PARTICIPATION:  'Outreach Participation',
};

interface Props { params: Promise<{ id: string }> }

export default async function CustomerDetailPage({ params }: Props) {
  await requireAnalyst();
  const { id } = await params;

  const customer = await db.customerAccount.findUnique({
    where: { accountId: id },
    include: {
      parcel: true,
      violations: { orderBy: { detectedAt: 'desc' }, take: 5 },
      incentives: { orderBy: { appliedAt: 'desc' }, take: 10 },
      _count: { select: { violations: true, incentives: true } },
    },
  });

  if (!customer) notFound();

  const rows = [
    { label: 'Account ID',    value: customer.accountId },
    { label: 'Meter ID',      value: customer.meterId },
    { label: 'Service Address', value: customer.serviceAddress },
    { label: 'Email',         value: customer.email ?? '—' },
    { label: 'Phone',         value: customer.phone ?? '—' },
    { label: 'Water Type',    value: customer.isReclaimed ? 'Reclaimed' : 'Potable' },
    { label: 'Parcel ID',     value: customer.parcelId },
    { label: 'Zone',          value: customer.parcel?.wateringZone ?? '—' },
    { label: 'Status',        value: customer.isActive ? 'Active' : 'Inactive' },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/analyst/customers" className="hover:text-teal-600">Customers</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{customer.accountId}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{customer.firstName} {customer.lastName}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{customer.serviceAddress}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'px-3 py-1 rounded-full text-xs font-bold border',
            customer.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200',
          )}>
            {customer.isActive ? 'Active' : 'Inactive'}
          </span>
          {customer.isReclaimed && (
            <span className="px-3 py-1 rounded-full text-xs font-bold border bg-teal-50 text-teal-700 border-teal-200">
              Reclaimed
            </span>
          )}
        </div>
      </div>

      {/* Detail grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Details</p>
        </div>
        <dl className="divide-y divide-slate-50">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center px-5 py-3 gap-4">
              <dt className="w-40 shrink-0 text-xs font-semibold text-slate-500">{row.label}</dt>
              <dd className="text-sm text-slate-900 font-mono">{String(row.value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <ApplyIncentiveButton accountId={customer.accountId} />
        <Link
          href={`/analyst/analytics/incentives?accountId=${customer.accountId}`}
          className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-sm font-medium text-slate-700 rounded-lg transition-colors"
        >
          View Incentive History
        </Link>
      </div>

      {/* Incentives */}
      {customer.incentives.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recent Incentives ({customer._count.incentives} total)
            </p>
          </div>
          <div className="divide-y divide-slate-50">
            {customer.incentives.map((inc) => (
              <div key={inc.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{TYPE_LABELS[inc.type] ?? inc.type}</p>
                  <p className="text-xs text-slate-500">
                    ${Number(inc.amount).toFixed(2)} — {new Date(inc.appliedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border', STATUS_STYLES[inc.status] ?? '')}>
                  {inc.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Violations */}
      {customer.violations.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recent Violations ({customer._count.violations} total)
            </p>
          </div>
          <div className="divide-y divide-slate-50">
            {customer.violations.map((v) => (
              <div key={v.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{v.violationType.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-500">{v.parcelId}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{new Date(v.detectedAt).toLocaleDateString()}</span>
                  <Link href={`/enforcement/violations/${v.id}`} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

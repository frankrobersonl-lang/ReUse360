/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireEnforcement } from '@/lib/auth.server';
import { db }                from '@/lib/db';
import { notFound }          from 'next/navigation';
import Link                  from 'next/link';
import { cn }                from '@/lib/utils';
import { PermitActions }     from './PermitActions';

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED:    'bg-slate-50  text-slate-600  border-slate-200',
  UNDER_REVIEW: 'bg-amber-50  text-amber-700  border-amber-200',
  APPROVED:     'bg-green-50  text-green-700  border-green-200',
  DENIED:       'bg-red-50    text-red-600    border-red-200',
  EXPIRED:      'bg-slate-50  text-slate-400  border-slate-200',
  REVOKED:      'bg-red-50    text-red-600    border-red-200',
};

const VIOLATION_STATUS_STYLES: Record<string, string> = {
  DETECTED:   'bg-amber-50  text-amber-700',
  CONFIRMED:  'bg-orange-50 text-orange-700',
  NOTIFIED:   'bg-blue-50   text-blue-700',
  SR_CREATED: 'bg-purple-50 text-purple-700',
  RESOLVED:   'bg-green-50  text-green-700',
  DISMISSED:  'bg-slate-100 text-slate-400',
};

interface Props { params: Promise<{ id: string }> }

export default async function PermitDetailPage({ params }: Props) {
  await requireEnforcement();
  const { id } = await params;

  const permit = await db.permit.findUnique({
    where: { id },
    include: { issuedByUser: true },
  });

  if (!permit) notFound();

  // Fetch parcel info and violations for this parcel
  const [parcel, violations] = await Promise.all([
    db.parcel.findFirst({ where: { parcelId: permit.parcelId } }),
    db.violation.findMany({
      where: { parcelId: permit.parcelId },
      orderBy: { detectedAt: 'desc' },
      take: 10,
    }),
  ]);

  // Fetch customer account
  const account = await db.customerAccount.findFirst({
    where: { accountId: permit.accountId },
  });

  const rows = [
    { label: 'Permit Type',    value: permit.permitType.replace(/_/g, ' ') },
    { label: 'Account ID',     value: permit.accountId },
    { label: 'Customer',       value: account ? `${account.firstName} ${account.lastName}` : '—' },
    { label: 'Service Address', value: account?.serviceAddress ?? '—' },
    { label: 'Parcel ID',      value: permit.parcelId },
    { label: 'Watering Zone',  value: parcel?.wateringZone ?? '—' },
    { label: 'Submitted',      value: new Date(permit.submittedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) },
    { label: 'Approved',       value: permit.approvedAt
        ? new Date(permit.approvedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        : '—' },
    { label: 'Expires',        value: permit.expiresAt
        ? new Date(permit.expiresAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        : '—' },
    { label: 'Issued By',      value: permit.issuedByUser
        ? `${permit.issuedByUser.firstName} ${permit.issuedByUser.lastName}`
        : 'Unassigned' },
    { label: 'Conditions',     value: permit.conditions ?? 'None' },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/enforcement/permits" className="hover:text-teal-600">Permits</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{id.slice(0, 8)}…</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{permit.permitType.replace(/_/g, ' ')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {account?.serviceAddress ?? permit.parcelId} — Submitted {new Date(permit.submittedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <span className={cn('px-3 py-1 rounded-full text-xs font-bold border', STATUS_STYLES[permit.status] ?? '')}>
          {permit.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Detail grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Permit Details</p>
        </div>
        <dl className="divide-y divide-slate-50">
          {rows.map(row => (
            <div key={row.label} className="flex items-center px-5 py-3 gap-4">
              <dt className="w-40 shrink-0 text-xs font-semibold text-slate-500">{row.label}</dt>
              <dd className="text-sm text-slate-900 font-mono">{String(row.value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Property / Parcel Info */}
      {parcel && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Property Information</p>
          </div>
          <dl className="divide-y divide-slate-50">
            {[
              { label: 'Site Address',        value: parcel.siteAddress },
              { label: 'City',                value: parcel.city },
              { label: 'ZIP',                 value: parcel.zip },
              { label: 'Watering Zone',       value: parcel.wateringZone ?? '—' },
              { label: 'Irrigation Day',      value: parcel.irrigationDay ?? '—' },
              { label: 'Reclaimed Eligible',  value: parcel.isReclaimedEligible ? 'Yes' : 'No' },
            ].map(row => (
              <div key={row.label} className="flex items-center px-5 py-3 gap-4">
                <dt className="w-40 shrink-0 text-xs font-semibold text-slate-500">{row.label}</dt>
                <dd className="text-sm text-slate-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Status Actions (client) */}
      <PermitActions permitId={id} currentStatus={permit.status} />

      {/* Associated Violations */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Violations at this Parcel
          </p>
        </div>
        {violations.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            No violations linked to this parcel.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Detected</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Read Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {violations.map((v: any) => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/enforcement/violations/${v.id}`}
                      className="font-medium text-teal-600 hover:text-teal-700"
                    >
                      {v.violationType.replace(/_/g, ' ')}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                      VIOLATION_STATUS_STYLES[v.status] ?? 'bg-slate-100 text-slate-600',
                    )}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(v.detectedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono">
                    {String(v.readValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireEnforcement } from '@/lib/auth.server';
import { db }                from '@/lib/db';
import { notFound }          from 'next/navigation';
import Link                  from 'next/link';
import { cn }                from '@/lib/utils';
import { ComplaintActions }  from './ComplaintActions';

const STATUS_STYLES: Record<string, string> = {
  OPEN:          'bg-red-50    text-red-600    border-red-200',
  INVESTIGATING: 'bg-amber-50  text-amber-700  border-amber-200',
  RESOLVED:      'bg-green-50  text-green-700  border-green-200',
  DUPLICATE:     'bg-slate-50  text-slate-400  border-slate-200',
  UNFOUNDED:     'bg-slate-50  text-slate-400  border-slate-200',
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

export default async function ComplaintDetailPage({ params }: Props) {
  await requireEnforcement();
  const { id } = await params;

  const complaint = await db.complaint.findUnique({
    where: { id },
    include: {
      violation:  true,
      inspection: true,
    },
  });

  if (!complaint) notFound();

  // Fetch reporter account if available
  const reporter = complaint.reporterAccountId
    ? await db.customerAccount.findFirst({
        where: { accountId: complaint.reporterAccountId },
        include: { parcel: true },
      })
    : null;

  // Fetch violations at the reported parcel
  const linkedViolations = complaint.reportedParcelId
    ? await db.violation.findMany({
        where: { parcelId: complaint.reportedParcelId },
        orderBy: { detectedAt: 'desc' },
        take: 10,
      })
    : [];

  const rows = [
    { label: 'Address',        value: complaint.address },
    { label: 'Source',         value: complaint.source.replace(/_/g, ' ') },
    { label: 'Filed',          value: new Date(complaint.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) },
    { label: 'Parcel ID',     value: complaint.reportedParcelId ?? '—' },
    { label: 'Reporter Acct', value: complaint.reporterAccountId ?? '—' },
    { label: 'Cityworks SR',  value: complaint.cityworksSrId ?? 'Not created' },
    { label: 'Resolved At',   value: complaint.resolvedAt
        ? new Date(complaint.resolvedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        : '—' },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/enforcement/complaints" className="hover:text-teal-600">Complaints</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{id.slice(0, 8)}…</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{complaint.address}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {complaint.source.replace(/_/g, ' ')} complaint — {new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <span className={cn('px-3 py-1 rounded-full text-xs font-bold border', STATUS_STYLES[complaint.status] ?? '')}>
          {complaint.status}
        </span>
      </div>

      {/* Detail grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Complaint Details</p>
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

      {/* Description */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{complaint.description || 'No description provided.'}</p>
        </div>
      </div>

      {/* Complainant Info */}
      {reporter && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reporter Information</p>
          </div>
          <dl className="divide-y divide-slate-50">
            {[
              { label: 'Name',            value: `${reporter.firstName} ${reporter.lastName}` },
              { label: 'Account ID',      value: reporter.accountId },
              { label: 'Service Address',  value: reporter.serviceAddress },
              { label: 'Meter ID',         value: reporter.meterId },
              { label: 'Watering Zone',    value: reporter.parcel?.wateringZone ?? '—' },
            ].map(row => (
              <div key={row.label} className="flex items-center px-5 py-3 gap-4">
                <dt className="w-40 shrink-0 text-xs font-semibold text-slate-500">{row.label}</dt>
                <dd className="text-sm text-slate-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Linked Violation */}
      {complaint.violation && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Linked Violation</p>
          </div>
          <div className="px-5 py-3 flex items-center justify-between">
            <div>
              <Link
                href={`/enforcement/violations/${complaint.violation.id}`}
                className="text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                {complaint.violation.violationType.replace(/_/g, ' ')}
              </Link>
              <p className="text-xs text-slate-500 mt-0.5">
                {complaint.violation.status} — Detected {new Date(complaint.violation.detectedAt).toLocaleDateString()}
              </p>
            </div>
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
              VIOLATION_STATUS_STYLES[complaint.violation.status] ?? 'bg-slate-100 text-slate-600',
            )}>
              {complaint.violation.status}
            </span>
          </div>
        </div>
      )}

      {/* Linked Inspection */}
      {complaint.inspection && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Linked Inspection</p>
          </div>
          <div className="px-5 py-3 flex items-center justify-between">
            <div>
              <Link
                href={`/enforcement/inspections/${complaint.inspection.id}`}
                className="text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                {complaint.inspection.address}
              </Link>
              <p className="text-xs text-slate-500 mt-0.5">
                {complaint.inspection.status.replace(/_/g, ' ')} — {complaint.inspection.scheduledDate
                  ? new Date(complaint.inspection.scheduledDate).toLocaleDateString()
                  : 'Date TBD'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resolution Notes + Actions (client) */}
      <ComplaintActions
        complaintId={id}
        currentStatus={complaint.status}
        initialResolution={complaint.resolution ?? ''}
      />

      {/* Violations at this Parcel */}
      {linkedViolations.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Violations at Reported Parcel
            </p>
          </div>
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
              {linkedViolations.map((v: any) => (
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
        </div>
      )}
    </div>
  );
}

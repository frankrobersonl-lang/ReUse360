import { requireEnforcement } from '@/lib/auth.server';
import { db }                from '@/lib/db';
import { notFound }          from 'next/navigation';
import Link                  from 'next/link';
import { cn }                from '@/lib/utils';
import { InspectionActions } from './InspectionActions';
/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED:   'bg-slate-50  text-slate-600  border-slate-200',
  IN_PROGRESS: 'bg-blue-50   text-blue-700   border-blue-200',
  COMPLETE:    'bg-green-50  text-green-700  border-green-200',
  CANCELLED:   'bg-slate-50  text-slate-400  border-slate-200',
  NO_ACCESS:   'bg-amber-50  text-amber-700  border-amber-200',
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

export default async function InspectionDetailPage({ params }: Props) {
  await requireEnforcement();
  const { id } = await params;

  const inspection = await db.inspection.findUnique({
    where: { id },
    include: {
      violation:    true,
      assignedUser: true,
      complaints:   { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  if (!inspection) notFound();

  // Fetch all violations linked to this parcel for the violations table
  const linkedViolations = await db.violation.findMany({
    where: { parcelId: inspection.parcelId },
    orderBy: { detectedAt: 'desc' },
    take: 10,
  });

  const rows = [
    { label: 'Address',        value: inspection.address },
    { label: 'Parcel ID',      value: inspection.parcelId },
    { label: 'Account ID',     value: inspection.accountId },
    { label: 'Assigned To',    value: inspection.assignedUser
        ? `${inspection.assignedUser.firstName} ${inspection.assignedUser.lastName}`
        : 'Unassigned' },
    { label: 'Scheduled Date', value: inspection.scheduledDate
        ? new Date(inspection.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        : '—' },
    { label: 'Completed Date', value: inspection.completedDate
        ? new Date(inspection.completedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        : '—' },
    { label: 'Cityworks WO',   value: inspection.cityworksWoId ?? 'Not created' },
    { label: 'Source Violation', value: inspection.violation
        ? inspection.violation.violationType.replace(/_/g, ' ')
        : 'Manual inspection' },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/enforcement/inspections" className="hover:text-teal-600">Inspections</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{id.slice(0, 8)}…</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{inspection.address}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Inspection — {inspection.scheduledDate
              ? new Date(inspection.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : 'Date TBD'}
          </p>
        </div>
        <span className={cn('px-3 py-1 rounded-full text-xs font-bold border', STATUS_STYLES[inspection.status] ?? '')}>
          {inspection.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Detail grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inspection Details</p>
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

      {/* Actions + Notes (client) */}
      <InspectionActions
        inspectionId={id}
        currentStatus={inspection.status}
        initialFindings={inspection.findings ?? ''}
      />

      {/* Linked Violations */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Violations at this Parcel
          </p>
        </div>
        {linkedViolations.length === 0 ? (
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
        )}
      </div>

      {/* Complaints linked to this inspection */}
      {inspection.complaints.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Related Complaints</p>
          </div>
          <div className="divide-y divide-slate-50">
            {inspection.complaints.map((c: any) => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{c.source.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{c.description ?? 'No description'}</p>
                </div>
                <p className="text-xs text-slate-400">
                  {new Date(c.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

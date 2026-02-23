import { requireEnforcement }  from '@/lib/auth.server';
import { db }                  from '@/lib/db';
import { notFound }            from 'next/navigation';
import Link                    from 'next/link';
import { cn }                  from '@/lib/utils';
import { ConfirmViolationButton, CreateSRButton } from './ViolationActions';

const STATUS_STYLES: Record<string, string> = {
  DETECTED:   'bg-amber-50  text-amber-700  border-amber-200',
  CONFIRMED:  'bg-orange-50 text-orange-700 border-orange-200',
  NOTIFIED:   'bg-blue-50   text-blue-700   border-blue-200',
  SR_CREATED: 'bg-purple-50 text-purple-700 border-purple-200',
  RESOLVED:   'bg-green-50  text-green-700  border-green-200',
  DISMISSED:  'bg-slate-50  text-slate-400  border-slate-200',
};

interface Props { params: Promise<{ id: string }> }

export default async function ViolationDetailPage({ params }: Props) {
  const user       = await requireEnforcement();
  const { id }     = await params;

  const violation  = await db.violation.findUnique({
    where:   { id },
    include: {
      account:     true,
      inspections: { orderBy: { createdAt: 'desc' }, take: 5 },
      alerts:      { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  if (!violation) notFound();

  const rows = [
    { label: 'Account ID',    value: violation.accountId },
    { label: 'Meter ID',      value: violation.meterId },
    { label: 'Parcel ID',     value: violation.parcelId },
    { label: 'Watering Zone', value: violation.wateringZone ?? '—' },
    { label: 'Watering Day',  value: violation.wateringDay  ?? '—' },
    { label: 'Read Value',    value: `${violation.readValue} ${violation.flowUnit ?? 'gal'}` },
    { label: 'Ordinance Ref', value: violation.ordinanceRef ?? '—' },
    { label: 'Cityworks SR',  value: violation.cityworksSrId ?? 'Not created' },
    { label: 'Notes',         value: violation.notes ?? '—' },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/enforcement/violations" className="hover:text-teal-600">Violations</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{id.slice(0, 8)}…</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{violation.violationType.replace(/_/g, ' ')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{violation.account.serviceAddress}</p>
        </div>
        <span className={cn('px-3 py-1 rounded-full text-xs font-bold border', STATUS_STYLES[violation.status] ?? '')}>
          {violation.status}
        </span>
      </div>

      {/* Detail grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Violation Details</p>
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

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {violation.status === 'DETECTED' && (
          <ConfirmViolationButton violationId={id} />
        )}
        {(violation.status === 'CONFIRMED' || violation.status === 'NOTIFIED') && !violation.cityworksSrId && (
          <CreateSRButton violationId={id} />
        )}
        <Link
          href={`/enforcement/inspections/new?violationId=${id}`}
          className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-sm font-medium text-slate-700 rounded-lg transition-colors"
        >
          Schedule Inspection
        </Link>
      </div>

      {/* Inspection history */}
      {violation.inspections.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inspection History</p>
          </div>
          <div className="divide-y divide-slate-50">
            {violation.inspections.map(ins => (
              <div key={ins.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{ins.status}</p>
                  <p className="text-xs text-slate-500">{ins.address}</p>
                </div>
                <p className="text-xs text-slate-400">
                  {new Date(ins.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

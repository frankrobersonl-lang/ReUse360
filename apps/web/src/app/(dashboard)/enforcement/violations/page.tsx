import { requireEnforcement }  from '@/lib/auth.server';
import { db }                  from '@/lib/db';
import Link                    from 'next/link';
import { cn }                  from '@/lib/utils';
import { ViolationSearch }     from './ViolationSearch';
import { ViolationsTable }     from './ViolationsTable';

interface Props {
  searchParams: Promise<{ status?: string; type?: string; search?: string }>;
}

export default async function ViolationsPage({ searchParams }: Props) {
  await requireEnforcement();
  const { status, type, search } = await searchParams;

  const where: Record<string, unknown> = {};
  if (status) {
    where.status = status;
  } else {
    where.status = { not: 'DISMISSED' };
  }
  if (type) where.violationType = type;
  if (search?.trim()) {
    where.OR = [
      { caseNumber: { contains: search.trim(), mode: 'insensitive' } },
      { account: { serviceAddress: { contains: search.trim(), mode: 'insensitive' } } },
      { parcelId: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }

  const [violations, total] = await Promise.all([
    db.violation.findMany({
      take: 50,
      orderBy: { detectedAt: 'desc' },
      where: where as any,
      include: {
        account: { select: { serviceAddress: true, firstName: true, lastName: true, accountId: true } },
      },
    }),
    db.violation.count({ where: { status: { not: 'DISMISSED' } } }),
  ]);

  // Serialize for the client component
  const rows = violations.map(v => ({
    id: v.id,
    caseNumber: v.caseNumber,
    violationType: v.violationType,
    status: v.status,
    detectedAt: v.detectedAt.toISOString(),
    account: v.account,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Violations</h1>
          <p className="text-sm text-slate-500">{total} active violations in system</p>
        </div>
        <Link
          href="/enforcement/violations/new"
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Violation
        </Link>
      </div>

      {/* Search */}
      <ViolationSearch currentSearch={search ?? ''} currentStatus={status ?? ''} />

      {/* Quick status filters */}
      <div className="flex flex-wrap gap-2">
        {['', 'DETECTED', 'CONFIRMED', 'NOTIFIED', 'SR_CREATED', 'RESOLVED'].map(s => {
          const params = new URLSearchParams();
          if (s) params.set('status', s);
          if (search) params.set('search', search);
          const href = `/enforcement/violations${params.toString() ? `?${params}` : ''}`;
          return (
            <Link
              key={s}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                (status ?? '') === s
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              )}
            >
              {s || 'All Active'}
            </Link>
          );
        })}
      </div>

      <ViolationsTable violations={rows} />
    </div>
  );
}

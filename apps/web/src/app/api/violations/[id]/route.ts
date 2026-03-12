import { type NextRequest } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import db from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardApi('analytics:read');
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const violation = await db.violation.findUnique({
    where: { id },
    include: {
      account: true,
      inspections: { orderBy: { createdAt: 'desc' }, take: 20 },
      complaints: { orderBy: { createdAt: 'desc' }, take: 10 },
      alerts: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  if (!violation) {
    return Response.json({ error: 'Violation not found' }, { status: 404 });
  }

  // Count prior violations for this account to determine offense number
  const priorCount = await db.violation.count({
    where: {
      accountId: violation.accountId,
      detectedAt: { lt: violation.detectedAt },
      status: { not: 'DISMISSED' },
    },
  });

  // Build a chronological timeline from timestamps + related records
  const timeline: { date: string; event: string; detail: string }[] = [];

  timeline.push({
    date: violation.detectedAt.toISOString(),
    event: 'Violation Detected',
    detail: `${violation.violationType.replace(/_/g, ' ')} detected via AMI meter read`,
  });

  if (violation.confirmedAt) {
    timeline.push({
      date: violation.confirmedAt.toISOString(),
      event: 'Violation Confirmed',
      detail: 'Officer confirmed the violation after review',
    });
  }

  if (violation.cityworksSrId) {
    timeline.push({
      date: violation.updatedAt.toISOString(),
      event: 'Service Request Created',
      detail: `Cityworks SR: ${violation.cityworksSrId}`,
    });
  }

  for (const insp of violation.inspections) {
    timeline.push({
      date: insp.createdAt.toISOString(),
      event: `Inspection ${insp.status.replace(/_/g, ' ')}`,
      detail: insp.findings ?? insp.address,
    });
  }

  for (const alert of violation.alerts) {
    timeline.push({
      date: alert.createdAt.toISOString(),
      event: `Alert: ${alert.severity}`,
      detail: alert.subject,
    });
  }

  if (violation.resolvedAt) {
    timeline.push({
      date: violation.resolvedAt.toISOString(),
      event: 'Violation Resolved',
      detail: 'Case closed',
    });
  }

  if (violation.notes) {
    timeline.push({
      date: violation.createdAt.toISOString(),
      event: 'Officer Note',
      detail: violation.notes,
    });
  }

  // Sort timeline chronologically
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Fine schedule (FAC 40D-22)
  const CITATION_FEES: Record<string, { first: number; second: number; third: number }> = {
    WRONG_DAY:             { first: 193, second: 386, third: 579 },
    WRONG_TIME:            { first: 193, second: 386, third: 579 },
    EXCESSIVE_USAGE:       { first: 250, second: 500, third: 750 },
    CONTINUOUS_FLOW:       { first: 250, second: 500, third: 750 },
    LEAK_DETECTED:         { first: 100, second: 200, third: 300 },
    PROHIBITED_IRRIGATION: { first: 386, second: 579, third: 772 },
  };

  const fees = CITATION_FEES[violation.violationType] ?? { first: 193, second: 386, third: 579 };
  const offenseNumber = priorCount + 1;
  const fineAmount =
    offenseNumber === 1 ? fees.first :
    offenseNumber === 2 ? fees.second :
    fees.third;

  const daysOpen = Math.floor(
    (Date.now() - new Date(violation.detectedAt).getTime()) / (1000 * 60 * 60 * 24),
  );

  return Response.json({
    ...violation,
    timeline,
    priorCount,
    offenseNumber,
    fineAmount,
    daysOpen,
    citationFees: fees,
  });
}

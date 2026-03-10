import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import db from '@/lib/db';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardApi('jobs:trigger');
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const job = await db.connectorJob.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  if (job.status !== 'FAILED') {
    return NextResponse.json({ error: 'Only failed jobs can be retried' }, { status: 400 });
  }

  // Exponential backoff: 10s * 2^attemptCount (capped at 5 min)
  const delayMs = Math.min(10_000 * Math.pow(2, job.attemptCount), 300_000);
  const scheduledAt = new Date(Date.now() + delayMs);

  await db.connectorJob.update({
    where: { id },
    data: {
      status: 'QUEUED',
      errorMessage: null,
      scheduledAt,
      completedAt: null,
      startedAt: null,
    },
  });

  const delaySec = Math.round(delayMs / 1000);

  return NextResponse.json({
    ok: true,
    message: `Job re-queued with ${delaySec}s backoff delay (attempt ${job.attemptCount + 1}/${job.maxAttempts})`,
    scheduledAt: scheduledAt.toISOString(),
  });
}

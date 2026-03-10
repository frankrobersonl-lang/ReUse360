import { guardApi } from '@/lib/auth.server';
import { db }       from '@/lib/db';

interface Params { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const guard = await guardApi('violations:create_sr');
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const violation = await db.violation.findUnique({
    where:   { id },
    include: { account: true },
  });

  if (!violation) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!['CONFIRMED', 'NOTIFIED'].includes(violation.status)) {
    return Response.json({ error: `Status must be CONFIRMED or NOTIFIED, got: ${violation.status}` }, { status: 422 });
  }
  if (violation.cityworksSrId) {
    return Response.json({ error: 'SR already created', srId: violation.cityworksSrId }, { status: 409 });
  }

  // In production, the worker sr-sync queue creates SRs via CityworksService.
  // This endpoint uses mock SR IDs for dev/demo (CITYWORKS_TEST_MODE=true).
  const srId = `SR-${Date.now()}`;

  const updated = await db.violation.update({
    where: { id },
    data:  { cityworksSrId: srId, status: 'SR_CREATED' },
  });

  return Response.json({ srId, violation: updated });
}

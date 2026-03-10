import { guardApi } from '@/lib/auth.server';
import { db }       from '@/lib/db';

interface Params { params: Promise<{ id: string }> }

/** PATCH /api/inspections/:id — update status and/or findings */
export async function PATCH(req: Request, { params }: Params) {
  const guard = await guardApi('inspections:edit');
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await req.json();

  const inspection = await db.inspection.findUnique({ where: { id } });
  if (!inspection) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  // Status transition
  if (body.status && typeof body.status === 'string') {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      SCHEDULED:   ['IN_PROGRESS', 'CANCELLED', 'NO_ACCESS'],
      IN_PROGRESS: ['COMPLETE', 'NO_ACCESS', 'CANCELLED'],
      NO_ACCESS:   ['SCHEDULED', 'CANCELLED'],
    };
    const allowed = VALID_TRANSITIONS[inspection.status];
    if (!allowed || !allowed.includes(body.status)) {
      return Response.json(
        { error: `Cannot transition from ${inspection.status} to ${body.status}` },
        { status: 422 },
      );
    }
    data.status = body.status;
    if (body.status === 'COMPLETE') {
      data.completedDate = new Date();
    }
  }

  // Findings / notes
  if (typeof body.findings === 'string') {
    data.findings = body.findings;
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 422 });
  }

  const updated = await db.inspection.update({ where: { id }, data });
  return Response.json(updated);
}

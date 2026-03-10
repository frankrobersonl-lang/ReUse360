import { guardApi } from '@/lib/auth.server';
import { db }       from '@/lib/db';

interface Params { params: Promise<{ id: string }> }

/** PATCH /api/complaints/:id — update status and/or resolution */
export async function PATCH(req: Request, { params }: Params) {
  const guard = await guardApi('complaints:resolve');
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await req.json();

  const complaint = await db.complaint.findUnique({ where: { id } });
  if (!complaint) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  // Status transition
  if (body.status && typeof body.status === 'string') {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      OPEN:          ['INVESTIGATING', 'RESOLVED', 'DUPLICATE', 'UNFOUNDED'],
      INVESTIGATING: ['RESOLVED', 'DUPLICATE', 'UNFOUNDED'],
    };
    const allowed = VALID_TRANSITIONS[complaint.status];
    if (!allowed || !allowed.includes(body.status)) {
      return Response.json(
        { error: `Cannot transition from ${complaint.status} to ${body.status}` },
        { status: 422 },
      );
    }
    data.status = body.status;
    if (body.status === 'RESOLVED' || body.status === 'DUPLICATE' || body.status === 'UNFOUNDED') {
      data.resolvedAt = new Date();
    }
  }

  // Resolution notes
  if (typeof body.resolution === 'string') {
    data.resolution = body.resolution;
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 422 });
  }

  const updated = await db.complaint.update({ where: { id }, data });
  return Response.json(updated);
}

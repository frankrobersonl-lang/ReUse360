import { guardApi } from '@/lib/auth.server';
import { db }       from '@/lib/db';

interface Params { params: Promise<{ id: string }> }

/** PATCH /api/permits/:id — update permit status */
export async function PATCH(req: Request, { params }: Params) {
  const guard = await guardApi('permits:approve');
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await req.json();

  const permit = await db.permit.findUnique({ where: { id } });
  if (!permit) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  if (!body.status || typeof body.status !== 'string') {
    return Response.json({ error: 'status is required' }, { status: 422 });
  }

  const VALID_TRANSITIONS: Record<string, string[]> = {
    SUBMITTED:    ['UNDER_REVIEW', 'DENIED'],
    UNDER_REVIEW: ['APPROVED', 'DENIED'],
    APPROVED:     ['EXPIRED', 'REVOKED'],
  };

  const allowed = VALID_TRANSITIONS[permit.status];
  if (!allowed || !allowed.includes(body.status)) {
    return Response.json(
      { error: `Cannot transition from ${permit.status} to ${body.status}` },
      { status: 422 },
    );
  }

  const data: Record<string, unknown> = { status: body.status };

  if (body.status === 'APPROVED') {
    data.approvedAt = new Date();
    data.issuedBy = guard.user.userId;
    // Default expiry: 1 year from approval
    if (!permit.expiresAt) {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      data.expiresAt = expiry;
    }
  }

  if (typeof body.conditions === 'string') {
    data.conditions = body.conditions;
  }

  const updated = await db.permit.update({ where: { id }, data });
  return Response.json(updated);
}

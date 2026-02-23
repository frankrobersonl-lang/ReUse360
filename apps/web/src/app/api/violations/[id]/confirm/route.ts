import { guardApi } from '@/lib/auth.server';
import { db }       from '@/lib/db';

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const guard = await guardApi('violations:confirm');
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const violation = await db.violation.findUnique({ where: { id } });
  if (!violation) return Response.json({ error: 'Not found' }, { status: 404 });
  if (violation.status !== 'DETECTED') {
    return Response.json({ error: `Cannot confirm a violation in status: ${violation.status}` }, { status: 422 });
  }

  const updated = await db.violation.update({
    where: { id },
    data:  { status: 'CONFIRMED', confirmedAt: new Date() },
  });

  return Response.json(updated);
}

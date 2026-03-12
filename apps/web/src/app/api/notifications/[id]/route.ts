import { type NextRequest } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import db from '@/lib/db';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardApi('analytics:read');
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const notification = await db.notification.findUnique({ where: { id } });
  if (!notification) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  if (notification.userId !== guard.user.userId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updated = await db.notification.update({
    where: { id },
    data: { read: true },
  });

  return Response.json(updated);
}

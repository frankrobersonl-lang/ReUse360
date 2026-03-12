import { type NextRequest } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import db from '@/lib/db';

export async function GET(_req: NextRequest) {
  const guard = await guardApi('analytics:read');
  if (!guard.ok) return guard.response;

  const notifications = await db.notification.findMany({
    where: { userId: guard.user.userId },
    orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
    take: 50,
  });

  const unreadCount = await db.notification.count({
    where: { userId: guard.user.userId, read: false },
  });

  return Response.json({ notifications, unreadCount });
}

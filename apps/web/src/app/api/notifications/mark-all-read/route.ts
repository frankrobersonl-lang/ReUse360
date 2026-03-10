import { guardApi } from '@/lib/auth.server'
import { db } from '@/lib/db'

/**
 * POST /api/notifications/mark-all-read — mark all IN_APP notifications as read
 */
export async function POST() {
  const guard = await guardApi('alerts:dismiss')
  if (!guard.ok) return guard.response

  const result = await db.alert.updateMany({
    where: { channel: 'IN_APP', readAt: null },
    data: { readAt: new Date() },
  })

  return Response.json({ updated: result.count })
}

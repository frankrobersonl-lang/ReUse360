import { guardApi } from '@/lib/auth.server'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

/**
 * PATCH /api/notifications/mark-read — mark specific notification(s) as read
 * Body: { ids: string[] }
 */
export async function PATCH(req: NextRequest) {
  const guard = await guardApi('alerts:dismiss')
  if (!guard.ok) return guard.response

  const body = await req.json()
  const { ids } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: 'ids array is required' }, { status: 400 })
  }

  const result = await db.alert.updateMany({
    where: { id: { in: ids }, readAt: null },
    data: { readAt: new Date() },
  })

  return Response.json({ updated: result.count })
}

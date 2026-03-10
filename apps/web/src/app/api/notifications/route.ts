import { guardApi } from '@/lib/auth.server'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

/**
 * GET /api/notifications — list alerts (IN_APP channel) with filters
 * Query params: type (violation/sr/system), read (true/false), dateFrom, dateTo, limit, offset
 */
export async function GET(req: NextRequest) {
  const guard = await guardApi('alerts:read')
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const read = searchParams.get('read')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const where: Record<string, unknown> = {
    channel: 'IN_APP',
  }

  if (type === 'violation') where.violationId = { not: null }
  else if (type === 'sr') where.subject = { contains: 'Service Request', mode: 'insensitive' }
  else if (type === 'system') where.violationId = null

  if (read === 'true') where.readAt = { not: null }
  else if (read === 'false') where.readAt = null

  if (dateFrom || dateTo) {
    const createdAt: Record<string, unknown> = {}
    if (dateFrom) createdAt.gte = new Date(dateFrom)
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      createdAt.lte = end
    }
    where.createdAt = createdAt
  }

  const [notifications, total, unreadCount] = await Promise.all([
    db.alert.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      where: where as any,
      include: {
        account: { select: { firstName: true, lastName: true, serviceAddress: true, accountId: true } },
        violation: { select: { id: true, caseNumber: true, violationType: true, status: true } },
      },
    }),
    db.alert.count({ where: where as any }),
    db.alert.count({ where: { channel: 'IN_APP', readAt: null } }),
  ])

  return Response.json({ notifications, total, unreadCount })
}

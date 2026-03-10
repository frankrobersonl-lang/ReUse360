import { guardApi } from '@/lib/auth.server'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

/**
 * GET /api/admin/audit-logs — paginated ConnectorJob + Alert history
 * Query params: type, status, dateFrom, dateTo, limit, offset
 */
export async function GET(req: NextRequest) {
  const guard = await guardApi('audit:read')
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  // Build ConnectorJob where clause
  const jobWhere: Record<string, unknown> = {}
  if (type) jobWhere.jobType = type
  if (status === 'success') jobWhere.status = 'COMPLETE'
  else if (status === 'error') jobWhere.status = 'FAILED'
  else if (status === 'pending') jobWhere.status = { in: ['QUEUED', 'RUNNING', 'RETRYING'] }

  if (dateFrom || dateTo) {
    const createdAt: Record<string, unknown> = {}
    if (dateFrom) createdAt.gte = new Date(dateFrom)
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      createdAt.lte = end
    }
    jobWhere.createdAt = createdAt
  }

  const [jobs, total] = await Promise.all([
    db.connectorJob.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      where: jobWhere as any,
    }),
    db.connectorJob.count({ where: jobWhere as any }),
  ])

  // Get aggregate counts for KPI cards (unfiltered)
  const [totalJobs, successJobs, failedJobs, pendingJobs] = await Promise.all([
    db.connectorJob.count(),
    db.connectorJob.count({ where: { status: 'COMPLETE' } }),
    db.connectorJob.count({ where: { status: 'FAILED' } }),
    db.connectorJob.count({ where: { status: { in: ['QUEUED', 'RUNNING', 'RETRYING'] } } }),
  ])

  // Get distinct job types for filter dropdown
  const jobTypes = await db.connectorJob.findMany({
    distinct: ['jobType'],
    select: { jobType: true },
    orderBy: { jobType: 'asc' },
  })

  return Response.json({
    logs: jobs,
    total,
    stats: { totalJobs, successJobs, failedJobs, pendingJobs },
    jobTypes: jobTypes.map((j) => j.jobType),
  })
}

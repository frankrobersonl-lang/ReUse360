import { guardApi } from '@/lib/auth.server'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

/**
 * GET /api/admin/audit-logs/export — export ConnectorJob logs as CSV
 * Supports same filters as the list endpoint
 */
export async function GET(req: NextRequest) {
  const guard = await guardApi('audit:read')
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const where: Record<string, unknown> = {}
  if (type) where.jobType = type
  if (status === 'success') where.status = 'COMPLETE'
  else if (status === 'error') where.status = 'FAILED'
  else if (status === 'pending') where.status = { in: ['QUEUED', 'RUNNING', 'RETRYING'] }

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

  const jobs = await db.connectorJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5000,
    where: where as any,
  })

  // Build CSV
  const header = 'Timestamp,Job Type,Status,Attempts,Max Attempts,Started,Completed,Error'
  const rows = jobs.map((j) => {
    const esc = (s: string | null | undefined) => {
      if (!s) return ''
      return `"${s.replace(/"/g, '""')}"`
    }
    return [
      j.createdAt.toISOString(),
      j.jobType.replace(/_/g, ' '),
      j.status,
      j.attemptCount,
      j.maxAttempts,
      j.startedAt?.toISOString() ?? '',
      j.completedAt?.toISOString() ?? '',
      esc(j.errorMessage),
    ].join(',')
  })

  const csv = [header, ...rows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}

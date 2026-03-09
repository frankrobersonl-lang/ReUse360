import { guardApi } from '@/lib/auth.server'
import { db } from '@/lib/db'

interface Params { params: Promise<{ id: string }> }

const VALID_TRANSITIONS: Record<string, string[]> = {
  DETECTED:   ['CONFIRMED', 'DISMISSED'],
  CONFIRMED:  ['NOTIFIED', 'DISMISSED'],
  NOTIFIED:   ['SR_CREATED', 'RESOLVED', 'DISMISSED'],
  SR_CREATED: ['RESOLVED'],
  RESOLVED:   [],
  DISMISSED:  [],
}

/**
 * PATCH /api/violations/[id]/status
 * Body: { status: string, notes?: string }
 * Enforces valid status transitions.
 */
export async function PATCH(req: Request, { params }: Params) {
  const guard = await guardApi('violations:confirm')
  if (!guard.ok) return guard.response

  const { id } = await params
  const body = await req.json()
  const { status: newStatus, notes } = body

  if (!newStatus) {
    return Response.json({ error: 'status is required' }, { status: 400 })
  }

  const violation = await db.violation.findUnique({ where: { id } })
  if (!violation) return Response.json({ error: 'Not found' }, { status: 404 })

  const allowed = VALID_TRANSITIONS[violation.status] ?? []
  if (!allowed.includes(newStatus)) {
    return Response.json(
      { error: `Cannot transition from ${violation.status} to ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}` },
      { status: 422 },
    )
  }

  const data: Record<string, unknown> = { status: newStatus }

  if (newStatus === 'CONFIRMED') data.confirmedAt = new Date()
  if (newStatus === 'RESOLVED') data.resolvedAt = new Date()
  if (notes) data.notes = notes

  const updated = await db.violation.update({ where: { id }, data: data as any })
  return Response.json(updated)
}

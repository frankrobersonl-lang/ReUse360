import { guardApi } from '@/lib/auth.server'
import { db } from '@/lib/db'

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/admin/users/:id — get single user
 */
export async function GET(_req: Request, { params }: Params) {
  const guard = await guardApi('users:read')
  if (!guard.ok) return guard.response

  const { id } = await params
  const user = await db.user.findUnique({ where: { id } })
  if (!user) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json(user)
}

/**
 * PATCH /api/admin/users/:id — update user (role, name, active status)
 */
export async function PATCH(req: Request, { params }: Params) {
  const guard = await guardApi('users:edit')
  if (!guard.ok) return guard.response

  const { id } = await params
  const body = await req.json()
  const { role, firstName, lastName, isActive } = body

  const user = await db.user.findUnique({ where: { id } })
  if (!user) return Response.json({ error: 'Not found' }, { status: 404 })

  // Prevent deactivating yourself
  if (isActive === false && user.clerkId === guard.user.clerkId) {
    return Response.json({ error: 'Cannot deactivate your own account' }, { status: 422 })
  }

  // Build update payload
  const data: Record<string, unknown> = {}
  if (role && ['ADMIN', 'ANALYST', 'ENFORCEMENT'].includes(role)) data.role = role
  if (firstName !== undefined) data.firstName = firstName
  if (lastName !== undefined) data.lastName = lastName
  if (typeof isActive === 'boolean') data.isActive = isActive

  if (Object.keys(data).length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const updated = await db.user.update({ where: { id }, data: data as any })

  // Sync role to Clerk if changed
  if (role && role !== user.role && !user.clerkId.startsWith('pending_')) {
    try {
      const { clerkClient } = await import('@clerk/nextjs/server')
      const clerk = await clerkClient()
      await clerk.users.updateUser(user.clerkId, {
        publicMetadata: { role },
      })
    } catch (err) {
      console.error('[Admin] Failed to sync role to Clerk:', err)
    }
  }

  return Response.json(updated)
}

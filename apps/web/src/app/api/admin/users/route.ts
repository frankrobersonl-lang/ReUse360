import { guardApi } from '@/lib/auth.server'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

/**
 * GET /api/admin/users — list users with optional search/filter
 */
export async function GET(req: NextRequest) {
  const guard = await guardApi('users:read')
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.trim()
  const role = searchParams.get('role')
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const where: Record<string, unknown> = {}

  if (role) where.role = role
  if (status === 'active') where.isActive = true
  if (status === 'inactive') where.isActive = false

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      where: where as any,
    }),
    db.user.count({ where: where as any }),
  ])

  return Response.json({ users, total })
}

/**
 * POST /api/admin/users — invite a new user (creates Clerk invitation + local record)
 */
export async function POST(req: NextRequest) {
  const guard = await guardApi('users:invite')
  if (!guard.ok) return guard.response

  const body = await req.json()
  const { email, role, firstName, lastName } = body

  if (!email || !role) {
    return Response.json({ error: 'email and role are required' }, { status: 400 })
  }

  if (!['ADMIN', 'ANALYST', 'ENFORCEMENT'].includes(role)) {
    return Response.json({ error: 'role must be ADMIN, ANALYST, or ENFORCEMENT' }, { status: 400 })
  }

  // Check if user already exists
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return Response.json({ error: 'User with this email already exists' }, { status: 409 })
  }

  // Create Clerk invitation
  const { clerkClient } = await import('@clerk/nextjs/server')
  const clerk = await clerkClient()

  try {
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { role },
    })

    // Create local user record (will be updated by webhook on acceptance)
    const user = await db.user.create({
      data: {
        clerkId: `pending_${invitation.id}`,
        email,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        role,
        isActive: true,
      },
    })

    return Response.json({ user, invitationId: invitation.id }, { status: 201 })
  } catch (err: any) {
    // If Clerk invitation fails, return the error
    const message = err?.errors?.[0]?.message ?? err?.message ?? 'Failed to create invitation'
    return Response.json({ error: message }, { status: 422 })
  }
}

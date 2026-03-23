// lib/org.ts — ReUse360 Plus org context helper
// Automatically scopes all DB queries to the correct utility tenant

import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function getOrgId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: { orgId: true }
  })

  if (!user?.orgId) throw new Error('No organization found for user')
  return user.orgId
}

export async function getOrg() {
  const orgId = await getOrgId()
  const org = await db.organization.findUnique({
    where: { id: orgId }
  })
  if (!org) throw new Error('Organization not found')
  return org
}

export async function requireOrg() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: { orgId: true, role: true, isActive: true }
  })

  if (!user?.orgId) throw new Error('No organization found')
  if (!user.isActive) throw new Error('Account inactive')

  return { orgId: user.orgId, role: user.role }
}

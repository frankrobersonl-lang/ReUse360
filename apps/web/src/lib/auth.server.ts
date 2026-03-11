import { auth }  from '@clerk/nextjs/server';
import { redirect }           from 'next/navigation';
import {
  hasPermission,
  getDefaultRoute,
  getRoleLabel,
  type UserRole,
  type Permission,
} from '@reuse360/auth';

export interface AuthUser {
  userId:    string;
  clerkId:   string;
  email:     string;
  firstName: string | null;
  lastName:  string | null;
  role:      UserRole;
  roleLabel: string;
}

export async function requireAuth(): Promise<AuthUser> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  let role: UserRole | undefined;
  let email = '';
  let firstName: string | null = null;
  let lastName: string | null = null;

  try {
    const clerkUserFresh = await (await import('@clerk/nextjs/server')).clerkClient();
    const freshUser = await clerkUserFresh.users.getUser(userId);
    role = (freshUser.publicMetadata as { role?: string })?.role as UserRole | undefined;
    email     = freshUser.emailAddresses?.[0]?.emailAddress ?? '';
    firstName = freshUser.firstName ?? null;
    lastName  = freshUser.lastName  ?? null;
  } catch {
    // Clerk Backend API unreachable — fall back to DB
  }

  // Fall back to the DB user record if Clerk didn't have a role
  if (!role) {
    const { db } = await import('@/lib/db');
    const dbUser = await db.user.findFirst({ where: { clerkId: userId } });
    if (dbUser) {
      role      = dbUser.role as UserRole;
      email     = email || dbUser.email || '';
      firstName = firstName ?? dbUser.firstName ?? null;
      lastName  = lastName ?? dbUser.lastName ?? null;
    }
  }

  if (!role) redirect('/onboarding');

  return {
    userId,
    clerkId:   userId,
    email,
    firstName,
    lastName,
    role,
    roleLabel: getRoleLabel(role),
  };
}

export async function requireRole(allowed: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!allowed.includes(user.role)) redirect(getDefaultRoute(user.role));
  return user;
}

export async function requirePermission(permission: Permission): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasPermission(user.role, permission)) redirect('/unauthorized');
  return user;
}

export const requireAdmin       = () => requireRole(['ADMIN']);
export const requireAnalyst     = () => requireRole(['ADMIN', 'ANALYST']);
export const requireEnforcement = () => requireRole(['ADMIN', 'ENFORCEMENT']);

// Use in Route Handlers — returns Response instead of redirecting
export async function guardApi(permission: Permission): Promise<
  { ok: true; user: AuthUser } | { ok: false; response: Response }
> {
  const { userId } = await auth();
  if (!userId) return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };

  let role: UserRole | undefined;
  let email = '';
  let firstName: string | null = null;
  let lastName: string | null = null;

  try {
    // Fetch role from publicMetadata via Clerk Backend API
    const clerk = await (await import('@clerk/nextjs/server')).clerkClient();
    const freshUser = await clerk.users.getUser(userId);
    role = (freshUser.publicMetadata as { role?: string })?.role as UserRole | undefined;
    email     = freshUser.emailAddresses?.[0]?.emailAddress ?? '';
    firstName = freshUser.firstName ?? null;
    lastName  = freshUser.lastName  ?? null;
  } catch {
    // Clerk Backend API unreachable — fall back to DB below
  }

  // Fall back to the DB user record if Clerk didn't provide a role
  if (!role) {
    const { db } = await import('@/lib/db');
    const dbUser = await db.user.findFirst({ where: { clerkId: userId } });
    if (dbUser) {
      role      = dbUser.role as UserRole;
      email     = email || dbUser.email || '';
      firstName = firstName ?? dbUser.firstName ?? null;
      lastName  = lastName ?? dbUser.lastName ?? null;
    }
  }

  if (!role) {
    return { ok: false, response: Response.json({ error: 'No role assigned' }, { status: 403 }) };
  }

  if (!hasPermission(role, permission)) {
    return { ok: false, response: Response.json({ error: 'Forbidden', required: permission, role }, { status: 403 }) };
  }

  return {
    ok: true,
    user: {
      userId,
      clerkId:   userId,
      email,
      firstName,
      lastName,
      role,
      roleLabel: getRoleLabel(role),
    },
  };
}

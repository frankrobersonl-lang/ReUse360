import { auth }  from '@clerk/nextjs/server';
import { redirect }           from 'next/navigation';
import {
  hasPermission,
  getDefaultRoute,
  getRoleLabel,
  ROLE_PERMISSIONS,
  ROLE_WIDGETS,
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

  const clerkUserFresh = await (await import('@clerk/nextjs/server')).clerkClient();
  const freshUser = await clerkUserFresh.users.getUser(userId);
  const role = (freshUser.publicMetadata as { role?: string })?.role as UserRole | undefined;
  if (!role) redirect('/onboarding');

  return {
    userId,
    clerkId:   userId,
    email:     freshUser.emailAddresses?.[0]?.emailAddress ?? '',
    firstName: freshUser.firstName ?? null,
    lastName:  freshUser.lastName  ?? null,
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

  // Fetch role from publicMetadata (consistent with requireAuth)
  const clerk = await (await import('@clerk/nextjs/server')).clerkClient();
  const freshUser = await clerk.users.getUser(userId);
  const role = (freshUser.publicMetadata as { role?: string })?.role as UserRole | undefined;
  if (!role)  return { ok: false, response: Response.json({ error: 'No role assigned' }, { status: 403 }) };

  if (!hasPermission(role, permission)) {
    return { ok: false, response: Response.json({ error: 'Forbidden', permission }, { status: 403 }) };
  }

  return {
    ok: true,
    user: {
      userId,
      clerkId:   userId,
      email:     freshUser.emailAddresses?.[0]?.emailAddress ?? '',
      firstName: freshUser.firstName ?? null,
      lastName:  freshUser.lastName  ?? null,
      role,
      roleLabel: getRoleLabel(role),
    },
  };
}

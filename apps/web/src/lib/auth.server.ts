import { auth, currentUser }  from '@clerk/nextjs/server';
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
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect('/sign-in');

  const clerkUserFresh = await (await import('@clerk/nextjs/server')).clerkClient();
const freshUser = await clerkUserFresh.users.getUser(userId);
const role = (freshUser.publicMetadata as { role?: string })?.role as UserRole | undefined;
  if (!role) redirect('/onboarding');

  const user = await currentUser();
  return {
    userId,
    clerkId:   userId,
    email:     user?.emailAddresses?.[0]?.emailAddress ?? '',
    firstName: user?.firstName ?? null,
    lastName:  user?.lastName  ?? null,
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
  const { userId, sessionClaims } = await auth();
  if (!userId) return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };

  const role = (sessionClaims?.metadata as { role?: string })?.role as UserRole | undefined;
  if (!role)  return { ok: false, response: Response.json({ error: 'No role assigned' }, { status: 403 }) };

  if (!hasPermission(role, permission)) {
    return { ok: false, response: Response.json({ error: 'Forbidden', permission }, { status: 403 }) };
  }

  const clerkUser = await currentUser();
  return {
    ok: true,
    user: {
      userId,
      clerkId:   userId,
      email:     clerkUser?.emailAddresses?.[0]?.emailAddress ?? '',
      firstName: clerkUser?.firstName ?? null,
      lastName:  clerkUser?.lastName  ?? null,
      role,
      roleLabel: getRoleLabel(role),
    },
  };
}

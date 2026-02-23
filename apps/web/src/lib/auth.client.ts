'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import {
  hasPermission,
  getRoleLabel,
  ROLE_PERMISSIONS,
  ROLE_WIDGETS,
  type UserRole,
  type Permission,
  type DashboardWidget,
} from '@reuse360/auth';

export interface ClientAuthUser {
  userId:      string;
  email:       string;
  firstName:   string | null;
  lastName:    string | null;
  displayName: string;
  initials:    string;
  imageUrl:    string;
  role:        UserRole;
  roleLabel:   string;
  permissions: Permission[];
  widgets:     DashboardWidget[];
  can:         (p: Permission) => boolean;
  isLoaded:    boolean;
}

export function useReUse360Auth(): ClientAuthUser & { isLoaded: boolean } {
  const { userId, sessionClaims, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded }                  = useUser();

  const isLoaded = authLoaded && userLoaded;
  const role     = (sessionClaims?.metadata as { role?: string })?.role as UserRole ?? 'ENFORCEMENT';

  const firstName   = user?.firstName ?? null;
  const lastName    = user?.lastName  ?? null;
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ?? '';
  const initials    = [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || displayName[0]?.toUpperCase() ?? '?';

  return {
    userId:      userId ?? '',
    email:       user?.emailAddresses?.[0]?.emailAddress ?? '',
    firstName,
    lastName,
    displayName,
    initials,
    imageUrl:    user?.imageUrl ?? '',
    role,
    roleLabel:   getRoleLabel(role),
    permissions: ROLE_PERMISSIONS[role] ?? [],
    widgets:     ROLE_WIDGETS[role]     ?? [],
    can:         (p: Permission) => hasPermission(role, p),
    isLoaded,
  };
}

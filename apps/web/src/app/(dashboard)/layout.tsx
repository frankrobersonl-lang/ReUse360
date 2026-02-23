import { type ReactNode }     from 'react';
import { requireAuth }        from '@/lib/auth.server';
import { getRoleLabel, type UserRole } from '@reuse360/auth';
import { Sidebar }            from '@/components/dashboard/Sidebar';
import { MobileHeader }       from '@/components/dashboard/MobileHeader';

export const ROLE_STYLES: Record<UserRole, { bg: string; text: string; border: string; dot: string }> = {
  ADMIN:       { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  ANALYST:     { bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200',    dot: 'bg-sky-500'    },
  ENFORCEMENT: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireAuth();

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email.split('@')[0];
  const initials    = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || user.email[0].toUpperCase();
  const roleStyle   = ROLE_STYLES[user.role];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        user={user}
        displayName={displayName}
        initials={initials}
        roleStyle={roleStyle}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <MobileHeader
          user={user}
          displayName={displayName}
          initials={initials}
          roleStyle={roleStyle}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

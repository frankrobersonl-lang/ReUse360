'use client';

import { UserButton }    from '@clerk/nextjs';
import { getRoleLabel }  from '@reuse360/auth';
import { cn }            from '@/lib/utils';
import type { AuthUser } from '@/lib/auth.server';

interface MobileHeaderProps {
  user:        AuthUser;
  displayName: string;
  initials:    string;
  roleStyle:   { bg: string; text: string; border: string; dot: string };
}

export function MobileHeader({ user, displayName, initials, roleStyle }: MobileHeaderProps) {
  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2C8 2 4 6 4 10c0 5.25 8 12 8 12s8-6.75 8-12c0-4-4-8-8-8z"/>
            <circle cx="12" cy="10" r="2.5"/>
          </svg>
        </div>
        <span className="text-sm font-bold text-slate-900">ReUse360 Plus</span>
      </div>

      <div className={cn('px-2.5 py-1 rounded-full border text-xs font-semibold flex items-center gap-1.5', roleStyle.bg, roleStyle.border, roleStyle.text)}>
        <span className={cn('w-1.5 h-1.5 rounded-full', roleStyle.dot)} />
        {getRoleLabel(user.role)}
      </div>

      <UserButton afterSignOutUrl="/sign-in" />
    </header>
  );
}

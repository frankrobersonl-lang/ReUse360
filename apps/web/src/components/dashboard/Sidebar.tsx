'use client';

import Link                  from 'next/link';
import { usePathname }       from 'next/navigation';
import { UserButton }        from '@clerk/nextjs';
import { getRoleLabel, canAccessRoute, type UserRole } from '@reuse360/auth';
import { cn }                from '@/lib/utils';
import type { AuthUser }     from '@/lib/auth.server';
import {
  LayoutDashboard, AlertTriangle, ClipboardCheck,
  FileCheck, MessageSquare, Map, BarChart3, Droplets,
  TrendingUp, Recycle, Building2, Gauge, FileText,
  Settings2, Users, Scale, Plug, ClipboardList,
  Activity, ShieldAlert, ChevronDown,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, AlertTriangle, ClipboardCheck, FileCheck,
  MessageSquare, Map, BarChart3, Droplets, TrendingUp, Recycle,
  Building2, Gauge, FileText, Settings2, Users, Scale, Plug,
  ClipboardList, Activity, ShieldAlert,
};

interface NavItem {
  label:    string;
  href:     string;
  icon:     string;
  roles:    UserRole[];
  children?: Omit<NavItem, 'children'>[];
}

const NAV: NavItem[] = [
  {
    label: 'Administration', href: '/admin', icon: 'Settings2', roles: ['ADMIN'],
    children: [
      { label: 'Users',      href: '/admin/users',       icon: 'Users',         roles: ['ADMIN'] },
      { label: 'Ordinances', href: '/admin/ordinances',  icon: 'Scale',         roles: ['ADMIN'] },
      { label: 'Connectors', href: '/admin/settings',    icon: 'Plug',          roles: ['ADMIN'] },
      { label: 'Audit Log',  href: '/admin/audit-log',   icon: 'ClipboardList', roles: ['ADMIN'] },
      { label: 'Job Queue',  href: '/admin/jobs',        icon: 'Activity',      roles: ['ADMIN'] },
    ],
  },
  {
    label: 'Analytics', href: '/analyst/dashboard', icon: 'BarChart3', roles: ['ADMIN', 'ANALYST'],
    children: [
      { label: 'Dashboard',        href: '/analyst/dashboard',            icon: 'LayoutDashboard', roles: ['ADMIN', 'ANALYST'] },
      { label: 'Usage by Zone',    href: '/analyst/analytics/usage',      icon: 'Droplets',        roles: ['ADMIN', 'ANALYST'] },
      { label: 'Violation Trends', href: '/analyst/analytics/violations', icon: 'TrendingUp',      roles: ['ADMIN', 'ANALYST'] },
      { label: 'Reclaimed Water',  href: '/analyst/analytics/reclaimed',  icon: 'Recycle',         roles: ['ADMIN', 'ANALYST'] },
      { label: 'Customers',        href: '/analyst/customers',            icon: 'Building2',       roles: ['ADMIN', 'ANALYST'] },
      { label: 'Meters',           href: '/analyst/meters',               icon: 'Gauge',           roles: ['ADMIN', 'ANALYST'] },
      { label: 'Reports',          href: '/analyst/reports',              icon: 'FileText',        roles: ['ADMIN', 'ANALYST'] },
    ],
  },
  {
    label: 'Enforcement', href: '/enforcement/dashboard', icon: 'ShieldAlert', roles: ['ADMIN', 'ANALYST', 'ENFORCEMENT'],
    children: [
      { label: 'Dashboard',   href: '/enforcement/dashboard',   icon: 'LayoutDashboard', roles: ['ADMIN', 'ANALYST', 'ENFORCEMENT'] },
      { label: 'Violations',  href: '/enforcement/violations',  icon: 'AlertTriangle',   roles: ['ADMIN', 'ANALYST', 'ENFORCEMENT'] },
      { label: 'Inspections', href: '/enforcement/inspections', icon: 'ClipboardCheck',  roles: ['ADMIN', 'ANALYST', 'ENFORCEMENT'] },
      { label: 'Permits',     href: '/enforcement/permits',     icon: 'FileCheck',       roles: ['ADMIN', 'ENFORCEMENT'] },
      { label: 'Complaints',  href: '/enforcement/complaints',  icon: 'MessageSquare',   roles: ['ADMIN', 'ENFORCEMENT'] },
      { label: 'Map',         href: '/enforcement/map',         icon: 'Map',             roles: ['ADMIN', 'ANALYST', 'ENFORCEMENT'] },
    ],
  },
];

interface SidebarProps {
  user:        AuthUser;
  displayName: string;
  initials:    string;
  roleStyle:   { bg: string; text: string; border: string; dot: string };
}

export function Sidebar({ user, displayName, initials, roleStyle }: SidebarProps) {
  const pathname = usePathname();

  const visibleSections = NAV
    .filter(s => s.roles.includes(user.role))
    .map(s => ({ ...s, children: s.children?.filter(c => c.roles.includes(user.role)) }));

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-sm">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2C8 2 4 6 4 10c0 5.25 8 12 8 12s8-6.75 8-12c0-4-4-8-8-8z"/>
            <circle cx="12" cy="10" r="2.5"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-tight">ReUse360</p>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Plus</p>
        </div>
      </div>

      {/* Role badge */}
      <div className={cn('mx-4 mt-4 mb-1 px-3 py-2 rounded-lg border flex items-center gap-2', roleStyle.bg, roleStyle.border)}>
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', roleStyle.dot)} />
        <span className={cn('text-xs font-semibold truncate', roleStyle.text)}>
          {getRoleLabel(user.role)}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {visibleSections.map(section => (
          <NavSection key={section.href} section={section} pathname={pathname} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-100 p-4 flex items-center gap-3">
        <UserButton afterSignOutUrl="/sign-in" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
        </div>
      </div>
    </aside>
  );
}

function NavSection({ section, pathname }: { section: NavItem & { children?: NavItem[] }; pathname: string }) {
  const isActive = pathname.startsWith(section.href);
  const Icon     = ICON_MAP[section.icon] ?? LayoutDashboard;

  if (!section.children?.length) {
    return (
      <Link
        href={section.href}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
          isActive ? 'bg-teal-50 text-teal-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {section.label}
      </Link>
    );
  }

  return (
    <div>
      <div className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium',
        isActive ? 'text-slate-900' : 'text-slate-500'
      )}>
        <Icon className="w-4 h-4 shrink-0" />
        {section.label}
      </div>
      <div className="ml-4 pl-3 border-l border-slate-100 space-y-0.5">
        {section.children?.map(child => {
          const ChildIcon    = ICON_MAP[child.icon] ?? LayoutDashboard;
          const childActive  = pathname === child.href || pathname.startsWith(child.href + '/');
          return (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                childActive ? 'bg-teal-50 text-teal-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <ChildIcon className="w-3.5 h-3.5 shrink-0" />
              {child.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

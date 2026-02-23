// ─────────────────────────────────────────────
// @reuse360plus/auth — Role Permissions
// Single source of truth for RBAC
// Used by: middleware, API guards, UI conditionals
// ─────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'ANALYST' | 'ENFORCEMENT';

// ── Route Permissions ────────────────────────

export const ROLE_ROUTES: Record<UserRole, string[]> = {
  ADMIN: [
    '/admin',
    '/admin/users',
    '/admin/users/invite',
    '/admin/users/[id]',
    '/admin/settings',
    '/admin/settings/beacon',
    '/admin/settings/cityworks',
    '/admin/settings/gis',
    '/admin/settings/notifications',
    '/admin/ordinances',
    '/admin/ordinances/[id]',
    '/admin/audit-log',
    '/admin/jobs',
    '/admin/jobs/[id]',
    '/admin/reports',
    '/admin/reports/export',
    '/analyst',
    '/analyst/dashboard',
    '/analyst/analytics',
    '/analyst/analytics/usage',
    '/analyst/analytics/violations',
    '/analyst/analytics/reclaimed',
    '/analyst/customers',
    '/analyst/customers/[id]',
    '/analyst/meters',
    '/analyst/meters/[id]',
    '/analyst/alerts',
    '/analyst/reports',
    '/enforcement',
    '/enforcement/dashboard',
    '/enforcement/violations',
    '/enforcement/violations/[id]',
    '/enforcement/inspections',
    '/enforcement/inspections/[id]',
    '/enforcement/inspections/new',
    '/enforcement/permits',
    '/enforcement/permits/[id]',
    '/enforcement/complaints',
    '/enforcement/complaints/[id]',
    '/enforcement/map',
  ],

  ANALYST: [
    '/analyst',
    '/analyst/dashboard',
    '/analyst/analytics',
    '/analyst/analytics/usage',
    '/analyst/analytics/violations',
    '/analyst/analytics/reclaimed',
    '/analyst/customers',
    '/analyst/customers/[id]',
    '/analyst/meters',
    '/analyst/meters/[id]',
    '/analyst/alerts',
    '/analyst/reports',
    '/enforcement/dashboard',
    '/enforcement/violations',
    '/enforcement/violations/[id]',
    '/enforcement/inspections',
    '/enforcement/inspections/[id]',
    '/enforcement/map',
  ],

  ENFORCEMENT: [
    '/enforcement',
    '/enforcement/dashboard',
    '/enforcement/violations',
    '/enforcement/violations/[id]',
    '/enforcement/inspections',
    '/enforcement/inspections/[id]',
    '/enforcement/inspections/new',
    '/enforcement/permits',
    '/enforcement/permits/[id]',
    '/enforcement/complaints',
    '/enforcement/complaints/[id]',
    '/enforcement/map',
  ],
};

// ── Action Permissions ────────────────────────
// Format: resource:action

export type Permission =
  // Users
  | 'users:read'
  | 'users:invite'
  | 'users:edit'
  | 'users:delete'
  // Violations
  | 'violations:read'
  | 'violations:confirm'
  | 'violations:dismiss'
  | 'violations:create_sr'
  // Inspections
  | 'inspections:read'
  | 'inspections:create'
  | 'inspections:edit'
  | 'inspections:complete'
  | 'inspections:assign'
  // Permits
  | 'permits:read'
  | 'permits:create'
  | 'permits:approve'
  | 'permits:deny'
  | 'permits:revoke'
  // Complaints
  | 'complaints:read'
  | 'complaints:create'
  | 'complaints:resolve'
  | 'complaints:assign'
  // Analytics
  | 'analytics:read'
  | 'analytics:export'
  // Customers
  | 'customers:read'
  | 'customers:edit'
  // Settings
  | 'settings:read'
  | 'settings:edit'
  | 'settings:connectors'
  // Ordinances
  | 'ordinances:read'
  | 'ordinances:edit'
  // Jobs / System
  | 'jobs:read'
  | 'jobs:trigger'
  | 'jobs:cancel'
  // Audit
  | 'audit:read'
  // Reports
  | 'reports:read'
  | 'reports:export'
  // Alerts
  | 'alerts:read'
  | 'alerts:dismiss';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'users:read', 'users:invite', 'users:edit', 'users:delete',
    'violations:read', 'violations:confirm', 'violations:dismiss', 'violations:create_sr',
    'inspections:read', 'inspections:create', 'inspections:edit', 'inspections:complete', 'inspections:assign',
    'permits:read', 'permits:create', 'permits:approve', 'permits:deny', 'permits:revoke',
    'complaints:read', 'complaints:create', 'complaints:resolve', 'complaints:assign',
    'analytics:read', 'analytics:export',
    'customers:read', 'customers:edit',
    'settings:read', 'settings:edit', 'settings:connectors',
    'ordinances:read', 'ordinances:edit',
    'jobs:read', 'jobs:trigger', 'jobs:cancel',
    'audit:read',
    'reports:read', 'reports:export',
    'alerts:read', 'alerts:dismiss',
  ],

  ANALYST: [
    'violations:read',
    'inspections:read',
    'permits:read',
    'complaints:read',
    'analytics:read', 'analytics:export',
    'customers:read',
    'settings:read',
    'ordinances:read',
    'jobs:read',
    'reports:read', 'reports:export',
    'alerts:read', 'alerts:dismiss',
  ],

  ENFORCEMENT: [
    'violations:read', 'violations:confirm', 'violations:dismiss', 'violations:create_sr',
    'inspections:read', 'inspections:create', 'inspections:edit', 'inspections:complete',
    'permits:read', 'permits:create',
    'complaints:read', 'complaints:create', 'complaints:resolve',
    'customers:read',
    'reports:read',
    'alerts:read', 'alerts:dismiss',
  ],
};

// ── Dashboard Widgets ─────────────────────────

export type DashboardWidget =
  | 'kpi_violations_today'
  | 'kpi_violations_week'
  | 'kpi_open_inspections'
  | 'kpi_compliance_rate'
  | 'kpi_system_water_usage'
  | 'kpi_reclaimed_adoption'
  | 'kpi_leak_alerts'
  | 'kpi_endpoint_health'
  | 'kpi_active_permits'
  | 'kpi_open_complaints'
  | 'kpi_users_total'
  | 'kpi_jobs_status'
  | 'chart_violations_trend'
  | 'chart_usage_by_zone'
  | 'chart_reclaimed_vs_potable'
  | 'chart_violation_type_breakdown'
  | 'chart_inspection_status'
  | 'chart_compliance_over_time'
  | 'chart_system_flow_7day'
  | 'map_violation_heatmap'
  | 'map_inspection_assignments'
  | 'table_recent_violations'
  | 'table_pending_inspections'
  | 'table_open_complaints'
  | 'table_expiring_permits'
  | 'table_recent_alerts'
  | 'table_connector_jobs'
  | 'table_user_activity'
  | 'panel_beacon_health'
  | 'panel_cityworks_sr_queue'
  | 'panel_quick_actions';

export const ROLE_WIDGETS: Record<UserRole, DashboardWidget[]> = {
  ADMIN: [
    'kpi_violations_today',
    'kpi_violations_week',
    'kpi_open_inspections',
    'kpi_compliance_rate',
    'kpi_system_water_usage',
    'kpi_reclaimed_adoption',
    'kpi_leak_alerts',
    'kpi_endpoint_health',
    'kpi_active_permits',
    'kpi_open_complaints',
    'kpi_users_total',
    'kpi_jobs_status',
    'chart_violations_trend',
    'chart_usage_by_zone',
    'chart_reclaimed_vs_potable',
    'chart_violation_type_breakdown',
    'chart_inspection_status',
    'chart_compliance_over_time',
    'chart_system_flow_7day',
    'map_violation_heatmap',
    'map_inspection_assignments',
    'table_recent_violations',
    'table_pending_inspections',
    'table_open_complaints',
    'table_expiring_permits',
    'table_recent_alerts',
    'table_connector_jobs',
    'table_user_activity',
    'panel_beacon_health',
    'panel_cityworks_sr_queue',
    'panel_quick_actions',
  ],

  ANALYST: [
    'kpi_violations_today',
    'kpi_violations_week',
    'kpi_compliance_rate',
    'kpi_system_water_usage',
    'kpi_reclaimed_adoption',
    'kpi_leak_alerts',
    'kpi_endpoint_health',
    'chart_violations_trend',
    'chart_usage_by_zone',
    'chart_reclaimed_vs_potable',
    'chart_violation_type_breakdown',
    'chart_compliance_over_time',
    'chart_system_flow_7day',
    'table_recent_violations',
    'table_recent_alerts',
    'panel_beacon_health',
  ],

  ENFORCEMENT: [
    'kpi_violations_today',
    'kpi_open_inspections',
    'kpi_leak_alerts',
    'kpi_active_permits',
    'kpi_open_complaints',
    'chart_violation_type_breakdown',
    'chart_inspection_status',
    'map_violation_heatmap',
    'map_inspection_assignments',
    'table_recent_violations',
    'table_pending_inspections',
    'table_open_complaints',
    'table_expiring_permits',
    'panel_cityworks_sr_queue',
    'panel_quick_actions',
  ],
};

// ── Helper Functions ──────────────────────────

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  const allowedRoutes = ROLE_ROUTES[role] ?? [];

  return allowedRoutes.some((route) => {
    // Exact match
    if (route === pathname) return true;
    // Dynamic segment match: /enforcement/violations/[id] → /enforcement/violations/abc-123
    const pattern = route.replace(/\[.*?\]/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(pathname);
  });
}

export function getDefaultRoute(role: UserRole): string {
  const defaults: Record<UserRole, string> = {
    ADMIN:       '/admin',
    ANALYST:     '/analyst/dashboard',
    ENFORCEMENT: '/enforcement/dashboard',
  };
  return defaults[role];
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    ADMIN:       'Administrator',
    ANALYST:     'Data Analyst',
    ENFORCEMENT: 'Enforcement Officer',
  };
  return labels[role];
}

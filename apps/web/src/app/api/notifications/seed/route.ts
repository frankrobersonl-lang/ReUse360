import { type NextRequest } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import db from '@/lib/db';

export async function POST(_req: NextRequest) {
  const guard = await guardApi('analytics:read');
  if (!guard.ok) return guard.response;

  const userId = guard.user.userId;

  const samples = [
    {
      userId,
      title: 'New violation detected',
      message: 'Wrong-day irrigation detected at 1234 Palm Harbor Dr. Case PCU-2026-0047 created automatically.',
      type: 'VIOLATION_ALERT' as const,
      link: '/enforcement/violations',
    },
    {
      userId,
      title: 'Inspection due tomorrow',
      message: 'Scheduled inspection at 567 Clearwater Blvd is due Mar 13, 2026. Please confirm or reschedule.',
      type: 'INSPECTION_DUE' as const,
      link: '/enforcement/inspections',
    },
    {
      userId,
      title: 'Compliance rate dropped',
      message: 'Weekly compliance rate fell to 87.2%, down from 91.5% last week. 14 new violations detected.',
      type: 'COMPLIANCE_WARNING' as const,
      link: '/analyst/reports',
    },
    {
      userId,
      title: 'System maintenance complete',
      message: 'Beacon AMI connector sync completed successfully. 4,312 meter reads ingested in the last 24 hours.',
      type: 'SYSTEM' as const,
    },
    {
      userId,
      title: 'Patrol shift reminder',
      message: 'Your patrol shift starts at 7:00 AM tomorrow. Zone coverage: ODD addresses, Sector 3.',
      type: 'PATROL_REMINDER' as const,
      link: '/enforcement/patrol-log',
    },
  ];

  const created = await db.notification.createMany({ data: samples });

  return Response.json({ created: created.count }, { status: 201 });
}

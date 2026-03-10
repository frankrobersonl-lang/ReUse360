import { NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import { db } from '@/lib/db';

export async function GET() {
  const authError = await guardApi('analytics:read');
  if (authError) return authError;

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [violations, meterReads, zoneCounts] = await Promise.all([
    // Violations from last 90 days for trend line
    db.violation.findMany({
      where: { detectedAt: { gte: ninetyDaysAgo } },
      select: { detectedAt: true, violationType: true, status: true },
      orderBy: { detectedAt: 'asc' },
    }),

    // Meter reads from last 90 days, grouped by label (potable/reclaimed)
    db.meterRead.findMany({
      where: { readTime: { gte: ninetyDaysAgo } },
      select: { readTime: true, readValue: true, flow: true, label: true },
      orderBy: { readTime: 'asc' },
    }),

    // Parcel counts by watering zone
    db.parcel.groupBy({
      by: ['wateringZone'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
  ]);

  // --- Violation trends: group by week ---
  const weekMap = new Map<string, number>();
  for (const v of violations) {
    const d = new Date(v.detectedAt);
    // Start of week (Sunday)
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
  }
  const violationTrend = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  // --- Zone usage breakdown ---
  const zoneUsage = zoneCounts.map((z: { wateringZone: string | null; _count: { id: number } }) => ({
    zone: z.wateringZone ?? 'Unassigned',
    count: z._count.id,
  }));

  // --- Reclaimed vs Potable usage (aggregate flow) ---
  let potableFlow = 0;
  let reclaimedFlow = 0;
  for (const r of meterReads) {
    const flow = r.flow ? Number(r.flow) : 0;
    if (r.label === 'reclaimed') {
      reclaimedFlow += flow;
    } else {
      potableFlow += flow;
    }
  }
  const usageSplit = [
    { name: 'Potable', value: Math.round(potableFlow) },
    { name: 'Reclaimed', value: Math.round(reclaimedFlow) },
  ];

  // --- Violation type breakdown ---
  const typeMap = new Map<string, number>();
  for (const v of violations) {
    const type = v.violationType.replace(/_/g, ' ');
    typeMap.set(type, (typeMap.get(type) ?? 0) + 1);
  }
  const violationsByType = Array.from(typeMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => ({ type, count }));

  return NextResponse.json({
    violationTrend,
    zoneUsage,
    usageSplit,
    violationsByType,
  });
}

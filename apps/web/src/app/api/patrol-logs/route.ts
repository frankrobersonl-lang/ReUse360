import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { userId } = await auth();

  const url = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(url.get("limit") ?? "100"), 500);
  const offset = parseInt(url.get("offset") ?? "0");
  const startDate = url.get("startDate");
  const endDate = url.get("endDate");
  const officer = url.get("officer");

  const where: Record<string, unknown> = {};
  if (startDate || endDate) {
    where.patrolDate = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate + "T23:59:59.999Z") }),
    };
  }
  if (officer) {
    where.officerNames = { has: officer };
  }

  const [logs, total, agg] = await Promise.all([
    db.patrolLog.findMany({
      where: where as any,
      orderBy: { patrolDate: "desc" },
      take: limit,
      skip: offset,
    }),
    db.patrolLog.count({ where: where as any }),
    db.patrolLog.aggregate({
      where: where as any,
      _sum: {
        mileage: true,
        totalMiles: true,
        numberOfViolations: true,
        citationsIssued: true,
        warningsIssued: true,
        pamphletCount: true,
        residencesContacted: true,
      },
    }),
  ]);

  return NextResponse.json({
    logs,
    total,
    stats: {
      totalRecords: total,
      totalMiles: agg._sum.totalMiles ?? agg._sum.mileage ?? 0,
      totalViolations: agg._sum.numberOfViolations ?? 0,
      totalCitations: agg._sum.citationsIssued ?? 0,
      totalWarnings: agg._sum.warningsIssued ?? 0,
      totalPamphlets: agg._sum.pamphletCount ?? 0,
      totalResidences: agg._sum.residencesContacted ?? 0,
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  const body = await req.json();

  const startOdometer = body.startOdometer ? Number(body.startOdometer) : null;
  const endOdometer = body.endOdometer ? Number(body.endOdometer) : null;
  const totalMiles = startOdometer !== null && endOdometer !== null
    ? Math.max(0, endOdometer - startOdometer)
    : body.mileage ? Number(body.mileage) : 0;

  const log = await db.patrolLog.create({
    data: {
      officerNames: body.officerNames ?? [],
      patrolDate: new Date(body.patrolDate),
      mileage: totalMiles,
      startOdometer,
      endOdometer,
      totalMiles,
      vehicleId: body.vehicleId ?? null,
      numberOfViolations: Math.max(0, Math.floor(Number(body.numberOfViolations) || 0)),
      citationsIssued: Math.max(0, Math.floor(Number(body.citationsIssued) || 0)),
      warningsIssued: Math.max(0, Math.floor(Number(body.warningsIssued) || 0)),
      violationOccurred: body.violationOccurred ?? false,
      outreachConducted: body.outreachConducted ?? false,
      outreachType: body.outreachType ?? null,
      pamphletCount: Math.max(0, Math.floor(Number(body.pamphletCount) || 0)),
      residencesContacted: Math.max(0, Math.floor(Number(body.residencesContacted) || 0)),
      waterSource: body.waterSource ?? null,
      notes: body.notes ?? null,
      shiftStart: body.shiftStart ?? null,
      shiftEnd: body.shiftEnd ?? null,
      submittedById: userId,
    },
  });
  return NextResponse.json(log, { status: 201 });
}

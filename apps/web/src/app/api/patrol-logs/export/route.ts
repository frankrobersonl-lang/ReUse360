import { NextRequest, NextResponse } from "next/server";
import { guardApi } from "@/lib/auth.server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const guard = await guardApi("reports:export");

  const url = req.nextUrl.searchParams;
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
  if (officer) where.officerNames = { has: officer };

  const logs = await db.patrolLog.findMany({
    where: where as any,
    orderBy: { patrolDate: "desc" },
    take: 5000,
  });

  const header = [
    "Patrol Date",
    "Officer Name(s)",
    "Vehicle ID",
    "Shift Start",
    "Shift End",
    "Start Odometer",
    "End Odometer",
    "Total Miles Driven",
    "Violations Observed",
    "Citations Issued",
    "Warnings Issued",
    "Outreach Conducted",
    "Outreach Type",
    "Pamphlets Distributed",
    "Residences Contacted",
    "Water Source",
    "Notes",
  ].join(",");

  const rows = logs.map((log) => {
    const date = new Date(log.patrolDate).toLocaleDateString("en-US");
    const officers = log.officerNames.join("; ");
    const notes = (log.notes ?? "").replace(/"/g, """" );
    const miles = log.totalMiles ?? log.mileage ?? 0;
    return [
      date,
      `"${officers}"`,
      log.vehicleId ?? "",
      log.shiftStart ?? "",
      log.shiftEnd ?? "",
      log.startOdometer ?? "",
      log.endOdometer ?? "",
      miles,
      log.numberOfViolations,
      log.citationsIssued,
      log.warningsIssued,
      log.outreachConducted ? "Yes" : "No",
      log.outreachType ?? "",
      log.pamphletCount ?? 0,
      log.residencesContacted ?? 0,
      log.waterSource ?? "",
      `"${notes}"`,
    ].join(",");
  });

  const csv = [header, ...rows].join("
");
  const filename = `SWFWMD-patrol-logs-${startDate ?? "all"}-to-${endDate ?? "all"}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

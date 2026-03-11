import { NextRequest } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import { db } from '@/lib/db';
import { generateViolationNoticePDF } from '@/lib/pdf/violationNotice';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardApi('violations:read');
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const violation = await db.violation.findUnique({
    where: { id },
    include: {
      account: {
        select: { serviceAddress: true, firstName: true, lastName: true, accountId: true },
      },
    },
  });

  if (!violation) {
    return Response.json({ error: 'Violation not found' }, { status: 404 });
  }

  // Ensure a proper case number exists (PCU-YYYY-XXXX)
  let caseNumber = violation.caseNumber;
  if (!caseNumber) {
    const year = new Date().getFullYear();
    const lastCase = await db.violation.findFirst({
      where:   { caseNumber: { startsWith: `PCU-${year}-` } },
      orderBy: { caseNumber: 'desc' },
      select:  { caseNumber: true },
    });
    let seq = 1;
    if (lastCase?.caseNumber) {
      const lastSeq = parseInt(lastCase.caseNumber.split('-')[2]);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    caseNumber = `PCU-${year}-${String(seq).padStart(4, '0')}`;
    await db.violation.update({
      where: { id },
      data:  { caseNumber },
    });
  }

  // Count prior violations for this account to determine fee tier
  const priorCount = await db.violation.count({
    where: {
      accountId:  violation.accountId,
      detectedAt: { lt: violation.detectedAt },
      status:     { not: 'DISMISSED' },
    },
  });

  const pdfBytes = await generateViolationNoticePDF({
    caseNumber,
    violationType:  violation.violationType,
    detectedAt:     violation.detectedAt,
    confirmedAt:    violation.confirmedAt,
    serviceAddress: violation.account.serviceAddress,
    parcelId:       violation.parcelId,
    accountId:      violation.accountId,
    ownerName:      `${violation.account.firstName} ${violation.account.lastName}`,
    wateringZone:   violation.wateringZone,
    wateringDay:    violation.wateringDay,
    readValue:      violation.readValue ? Number(violation.readValue) : null,
    ordinanceRef:   violation.ordinanceRef,
    notes:          violation.notes,
    priorCount,
  });

  const filename = `violation-notice-${caseNumber}.pdf`;

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

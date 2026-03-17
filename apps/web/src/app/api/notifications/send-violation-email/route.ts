import { type NextRequest } from 'next/server';
import { guardApi } from '@/lib/auth.server';
import { db } from '@/lib/db';
import { sendEmail, maskEmail } from '@/lib/email/resend';
import {
  violationNoticeTemplate,
  correctionConfirmedTemplate,
  proactiveWarningTemplate,
} from '@/lib/email/templates';
import type { EmailType } from '@prisma/client';

// Fine schedule (same as violation detail route)
const CITATION_FEES: Record<string, { first: number; second: number; third: number }> = {
  WRONG_DAY:             { first: 193, second: 386, third: 579 },
  WRONG_TIME:            { first: 193, second: 386, third: 579 },
  EXCESSIVE_USAGE:       { first: 250, second: 500, third: 750 },
  CONTINUOUS_FLOW:       { first: 250, second: 500, third: 750 },
  LEAK_DETECTED:         { first: 100, second: 200, third: 300 },
  PROHIBITED_IRRIGATION: { first: 386, second: 579, third: 772 },
};

// Watering zone display helpers
function getAllowedDays(zone: string | null): string {
  if (!zone) return 'See your zone schedule';
  const upper = zone.toUpperCase();
  if (upper === 'ODD') return 'Wednesday & Saturday (odd addresses)';
  if (upper === 'EVEN') return 'Thursday & Sunday (even addresses)';
  return `${upper} (per zone schedule)`;
}

/**
 * POST /api/notifications/send-violation-email
 *
 * Body: { violationId: string, emailType: "VIOLATION_NOTICE" | "CORRECTION_CONFIRMED" | "PROACTIVE_WARNING" }
 *
 * Looks up the violation → account → email, selects the correct template,
 * sends via Resend, and logs to EmailLog.
 */
export async function POST(req: NextRequest) {
  const guard = await guardApi('violations:confirm');
  if (!guard.ok) return guard.response;

  let body: { violationId?: string; emailType?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { violationId, emailType } = body;

  if (!violationId || !emailType) {
    return Response.json(
      { error: 'violationId and emailType are required' },
      { status: 400 },
    );
  }

  const validTypes: EmailType[] = ['VIOLATION_NOTICE', 'CORRECTION_CONFIRMED', 'PROACTIVE_WARNING'];
  if (!validTypes.includes(emailType as EmailType)) {
    return Response.json(
      { error: `emailType must be one of: ${validTypes.join(', ')}` },
      { status: 400 },
    );
  }

  // Look up violation with account and parcel data
  const violation = await db.violation.findUnique({
    where: { id: violationId },
    include: {
      account: {
        include: {
          parcel: true,
        },
      },
    },
  });

  if (!violation) {
    return Response.json({ error: 'Violation not found' }, { status: 404 });
  }

  const account = violation.account;
  const recipientEmail = account.email;

  if (!recipientEmail) {
    return Response.json(
      { error: 'No email address on file for this account' },
      { status: 422 },
    );
  }

  // Compute offense number
  const priorCount = await db.violation.count({
    where: {
      accountId: violation.accountId,
      detectedAt: { lt: violation.detectedAt },
      status: { not: 'DISMISSED' },
    },
  });
  const offenseNumber = priorCount + 1;
  const fees = CITATION_FEES[violation.violationType] ?? { first: 193, second: 386, third: 579 };
  const fineAmount = offenseNumber === 1 ? fees.first : offenseNumber === 2 ? fees.second : fees.third;

  const address = account.serviceAddress;
  const zoneName = violation.wateringZone ?? account.parcel.wateringZone ?? 'Unknown';
  const allowedDays = getAllowedDays(zoneName);

  // Select template
  let emailContent: { subject: string; html: string };

  switch (emailType as EmailType) {
    case 'VIOLATION_NOTICE':
      emailContent = violationNoticeTemplate({
        address,
        caseNumber: violation.caseNumber ?? 'Pending',
        date: new Date(violation.detectedAt).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        violationType: violation.violationType,
        zoneName,
        allowedDays,
        offenseNumber,
        fineAmount,
      });
      break;

    case 'CORRECTION_CONFIRMED':
      emailContent = correctionConfirmedTemplate({
        address,
        complianceDate: new Date(violation.resolvedAt ?? new Date()).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        zoneName,
        allowedDays,
      });
      break;

    case 'PROACTIVE_WARNING':
      emailContent = proactiveWarningTemplate({
        address,
        zoneName,
        allowedDays,
        allowedHours: 'Before 10:00 AM or after 4:00 PM',
      });
      break;

    default:
      return Response.json({ error: 'Invalid email type' }, { status: 400 });
  }

  // Send email
  const result = await sendEmail({
    to: recipientEmail,
    subject: emailContent.subject,
    html: emailContent.html,
  });

  // Log to EmailLog
  const emailLog = await db.emailLog.create({
    data: {
      violationId: violation.id,
      accountId: account.accountId,
      emailType: emailType as EmailType,
      recipient: maskEmail(recipientEmail),
      subject: emailContent.subject,
      resendId: result.messageId,
      status: result.success ? 'SENT' : 'FAILED',
      errorMsg: result.error,
      sentBy: guard.user.clerkId,
    },
  });

  return Response.json({
    success: result.success,
    messageId: result.messageId,
    emailLogId: emailLog.id,
    recipient: maskEmail(recipientEmail),
    error: result.error,
  });
}

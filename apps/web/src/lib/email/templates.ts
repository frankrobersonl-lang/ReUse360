/**
 * Compliance Communication Email Templates
 *
 * Three template types for the automated notification workflow:
 * 1. VIOLATION_NOTICE — sent when a violation is detected/confirmed
 * 2. CORRECTION_CONFIRMED — sent when a violation is resolved or compliance observed
 * 3. PROACTIVE_WARNING — manual send by officers as a courtesy reminder
 */

// ── Shared layout ────────────────────────────────────────────────────

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#0d4f4f;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin:0;color:white;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
                      ReUse360 Plus
                    </h1>
                    <p style="margin:4px 0 0;color:#99cece;font-size:12px;letter-spacing:0.3px;">
                      PINELLAS COUNTY UTILITIES — WATER CONSERVATION
                    </p>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <span style="color:#5ec2c2;font-size:28px;">&#x1F4A7;</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
                Pinellas County Utilities — Water Conservation Division<br/>
                14 S Fort Harrison Ave, Clearwater, FL 33756<br/>
                Phone: (727) 464-4000
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;">
                This is an automated message from the ReUse360 Plus compliance system.
                Questions about your watering schedule? Visit our
                <a href="https://re-use360.vercel.app/chat" style="color:#0d9488;text-decoration:none;">AI Water Conservation Assistant</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Info box helper ──────────────────────────────────────────────────

function infoBox(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;width:140px;">${label}</td>
    <td style="padding:8px 12px;font-size:13px;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9;">${value}</td>
  </tr>`;
}

// ── Template data interfaces ─────────────────────────────────────────

export interface ViolationNoticeData {
  address: string;
  caseNumber: string;
  date: string;
  violationType: string;
  zoneName: string;
  allowedDays: string;
  offenseNumber: number;
  fineAmount: number;
}

export interface CorrectionConfirmedData {
  address: string;
  complianceDate: string;
  zoneName: string;
  allowedDays: string;
}

export interface ProactiveWarningData {
  address: string;
  zoneName: string;
  allowedDays: string;
  allowedHours: string;
}

// ── 1. Violation Notice ──────────────────────────────────────────────

export function violationNoticeTemplate(d: ViolationNoticeData): { subject: string; html: string } {
  const ordinalSuffix = d.offenseNumber === 1 ? 'st' : d.offenseNumber === 2 ? 'nd' : d.offenseNumber === 3 ? 'rd' : 'th';
  const noticeLabel = `${d.offenseNumber}${ordinalSuffix}`;

  const fineNote = d.offenseNumber === 1
    ? 'This is your <strong>first notice</strong>. No fine is assessed at this time. However, continued violations will result in citations starting at $193.00.'
    : `This is your <strong>${noticeLabel} notice</strong>. A citation of <strong>$${d.fineAmount.toFixed(2)}</strong> may be assessed.`;

  return {
    subject: `Water Conservation Notice — ${d.address} | Case ${d.caseNumber}`,
    html: layout(`
      <h2 style="margin:0 0 16px;font-size:18px;color:#0f172a;">Water Conservation Notice</h2>

      <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6;">
        Dear Property Owner at <strong>${d.address}</strong>,
      </p>

      <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6;">
        Our records indicate irrigation was observed at your property on
        <strong>${d.date}</strong> outside your permitted watering schedule.
        The violation type recorded is: <strong>${d.violationType.replace(/_/g, ' ')}</strong>.
      </p>

      <!-- Zone schedule box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;margin:0 0 20px;">
        <tr>
          <td style="padding:16px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0d4f4f;">Your Watering Schedule</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${infoBox('Zone', d.zoneName)}
              ${infoBox('Allowed Days', d.allowedDays)}
              ${infoBox('Allowed Hours', 'Before 10:00 AM or after 4:00 PM')}
              ${infoBox('Case Number', d.caseNumber)}
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6;">
        ${fineNote}
      </p>

      <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6;">
        Please adjust your irrigation timer to comply with the Pinellas County year-round
        watering schedule per <strong>FAC 40D-22 (SWFWMD Phase II)</strong>.
      </p>

      <!-- CTA -->
      <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr>
          <td style="background:#0d9488;border-radius:8px;">
            <a href="https://re-use360.vercel.app/chat"
               style="display:block;padding:12px 24px;color:white;font-size:14px;font-weight:600;text-decoration:none;">
              Questions? Chat with our AI Assistant &rarr;
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:12px;color:#94a3b8;">
        If you believe this notice was sent in error, please contact our office at (727) 464-4000.
      </p>
    `),
  };
}

// ── 2. Correction Confirmed ──────────────────────────────────────────

export function correctionConfirmedTemplate(d: CorrectionConfirmedData): { subject: string; html: string } {
  return {
    subject: `Thank You — Watering Compliance Confirmed | ${d.address}`,
    html: layout(`
      <h2 style="margin:0 0 16px;font-size:18px;color:#0f172a;">
        &#x2705; Compliance Confirmed
      </h2>

      <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6;">
        Dear Property Owner at <strong>${d.address}</strong>,
      </p>

      <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6;">
        We wanted to take a moment to <strong>thank you</strong> for correcting your
        irrigation schedule. Our records show your property has been in compliance
        since <strong>${d.complianceDate}</strong>.
      </p>

      <!-- Zone reminder -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin:0 0 20px;">
        <tr>
          <td style="padding:16px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#166534;">Your Watering Schedule (reminder)</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${infoBox('Zone', d.zoneName)}
              ${infoBox('Allowed Days', d.allowedDays)}
              ${infoBox('Allowed Hours', 'Before 10:00 AM or after 4:00 PM')}
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6;">
        Pinellas County appreciates your commitment to water conservation.
        Together, we protect one of Florida's most precious natural resources.
      </p>

      <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">
        Thank you for being a responsible water steward.
      </p>
    `),
  };
}

// ── 3. Proactive Warning ─────────────────────────────────────────────

export function proactiveWarningTemplate(d: ProactiveWarningData): { subject: string; html: string } {
  return {
    subject: `Friendly Reminder — Watering Schedule for ${d.address}`,
    html: layout(`
      <h2 style="margin:0 0 16px;font-size:18px;color:#0f172a;">
        Friendly Watering Schedule Reminder
      </h2>

      <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6;">
        Dear Property Owner at <strong>${d.address}</strong>,
      </p>

      <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6;">
        This is a friendly reminder about Pinellas County's <strong>year-round
        watering schedule</strong> for your property. Proper adherence helps conserve
        our shared water resources and avoids potential citations.
      </p>

      <!-- Zone schedule box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin:0 0 20px;">
        <tr>
          <td style="padding:16px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1e40af;">Your Watering Schedule</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${infoBox('Zone', d.zoneName)}
              ${infoBox('Allowed Days', d.allowedDays)}
              ${infoBox('Allowed Hours', d.allowedHours)}
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6;">
        <strong>No citation has been issued.</strong> This notice is provided as a
        courtesy to help you stay in compliance with FAC 40D-22 (SWFWMD Phase II) restrictions.
      </p>

      <!-- CTA -->
      <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr>
          <td style="background:#0d9488;border-radius:8px;">
            <a href="https://re-use360.vercel.app/chat"
               style="display:block;padding:12px 24px;color:white;font-size:14px;font-weight:600;text-decoration:none;">
              Learn More — AI Water Conservation Chat &rarr;
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:12px;color:#94a3b8;">
        Questions? Call us at (727) 464-4000 or visit re-use360.vercel.app/chat.
      </p>
    `),
  };
}

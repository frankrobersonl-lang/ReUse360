import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';

// ── Citation Fee Schedule (FAC 40D-22) ─────────────────────────────────

const CITATION_FEES: Record<string, { first: number; second: number; third: number }> = {
  WRONG_DAY:             { first: 193, second: 386, third: 579 },
  WRONG_TIME:            { first: 193, second: 386, third: 579 },
  EXCESSIVE_USAGE:       { first: 250, second: 500, third: 750 },
  CONTINUOUS_FLOW:       { first: 250, second: 500, third: 750 },
  LEAK_DETECTED:         { first: 100, second: 200, third: 300 },
  PROHIBITED_IRRIGATION: { first: 386, second: 579, third: 772 },
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  WRONG_DAY:             'Irrigation detected on a non-permitted watering day in violation of the SWFWMD Phase II water shortage restrictions.',
  WRONG_TIME:            'Irrigation detected during prohibited hours (10:00 AM – 4:00 PM) in violation of the SWFWMD Phase II water shortage restrictions.',
  EXCESSIVE_USAGE:       'Water consumption exceeded the maximum allowable threshold for the billing period, indicating excessive irrigation or waste.',
  CONTINUOUS_FLOW:       'Continuous water flow detected for an extended period, indicating a potential irrigation system malfunction or waste.',
  LEAK_DETECTED:         'Smart meter data indicates a probable leak. Continuous low-level flow was detected outside normal usage patterns.',
  PROHIBITED_IRRIGATION: 'Irrigation activity detected during a period when all outdoor watering is prohibited by emergency water shortage order.',
};

const CURE_PERIOD_DAYS = 10;

// ── Public Interface ───────────────────────────────────────────────────

export interface ViolationNoticeInput {
  caseNumber:     string;
  violationType:  string;
  detectedAt:     Date;
  confirmedAt?:   Date | null;
  serviceAddress: string;
  parcelId:       string;
  accountId:      string;
  ownerName:      string;
  wateringZone?:  string | null;
  wateringDay?:   string | null;
  readValue?:     number | null;
  ordinanceRef?:  string | null;
  notes?:         string | null;
  priorCount:     number; // 0 = first offense
}

export async function generateViolationNoticePDF(input: ViolationNoticeInput): Promise<Uint8Array> {
  const doc  = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const BLACK  = rgb(0, 0, 0);
  const GRAY   = rgb(0.35, 0.35, 0.35);
  const TEAL   = rgb(0, 0.47, 0.44);
  const margin = 60;
  let y = 740;

  // ── Helpers ──────────────────────────────────────────────────────

  function drawText(text: string, x: number, yPos: number, opts: { font?: PDFFont; size?: number; color?: typeof BLACK } = {}) {
    page.drawText(text, {
      x,
      y: yPos,
      font: opts.font ?? font,
      size: opts.size ?? 10,
      color: opts.color ?? BLACK,
    });
  }

  function drawLine(yPos: number) {
    page.drawLine({
      start: { x: margin, y: yPos },
      end:   { x: 552, y: yPos },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
  }

  function drawLabelValue(label: string, value: string, yPos: number): number {
    drawText(label, margin, yPos, { font: bold, size: 9, color: GRAY });
    drawText(value, margin + 140, yPos, { size: 10 });
    return yPos - 18;
  }

  function wrapText(text: string, maxWidth: number, fontSize: number, f: PDFFont): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (f.widthOfTextAtSize(test, fontSize) > maxWidth) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // ── Fee Calculation ──────────────────────────────────────────────

  const feeSchedule = CITATION_FEES[input.violationType] ?? CITATION_FEES.WRONG_DAY;
  const tier = input.priorCount === 0 ? 'first' : input.priorCount === 1 ? 'second' : 'third';
  const feeAmount = feeSchedule[tier];
  const complianceDate = new Date(input.detectedAt);
  complianceDate.setDate(complianceDate.getDate() + CURE_PERIOD_DAYS);

  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // ── Header ───────────────────────────────────────────────────────

  drawText('PINELLAS COUNTY UTILITIES', margin, y, { font: bold, size: 16, color: TEAL });
  y -= 18;
  drawText('Water Conservation Enforcement Division', margin, y, { font: bold, size: 11, color: GRAY });
  y -= 14;
  drawText('333 Chestnut Street, Clearwater, FL 33756', margin, y, { size: 9, color: GRAY });
  y -= 24;
  drawLine(y);
  y -= 24;

  drawText('NOTICE OF WATER USE VIOLATION', margin, y, { font: bold, size: 14, color: BLACK });
  y -= 28;

  // ── Case Info ────────────────────────────────────────────────────

  y = drawLabelValue('Case Number:', input.caseNumber, y);
  y = drawLabelValue('Violation Date:', fmtDate(input.detectedAt), y);
  if (input.confirmedAt) {
    y = drawLabelValue('Confirmed Date:', fmtDate(new Date(input.confirmedAt)), y);
  }
  y = drawLabelValue('Notice Issued:', fmtDate(new Date()), y);
  y -= 8;
  drawLine(y);
  y -= 20;

  // ── Property Info ────────────────────────────────────────────────

  drawText('PROPERTY INFORMATION', margin, y, { font: bold, size: 11, color: TEAL });
  y -= 20;
  y = drawLabelValue('Property Owner:', input.ownerName, y);
  y = drawLabelValue('Property Address:', input.serviceAddress, y);
  y = drawLabelValue('Parcel ID:', input.parcelId, y);
  y = drawLabelValue('Account ID:', input.accountId, y);
  if (input.wateringZone) {
    y = drawLabelValue('Watering Zone:', input.wateringZone, y);
  }
  if (input.wateringDay) {
    y = drawLabelValue('Permitted Day(s):', input.wateringDay, y);
  }
  y -= 8;
  drawLine(y);
  y -= 20;

  // ── Violation Details ────────────────────────────────────────────

  drawText('VIOLATION DETAILS', margin, y, { font: bold, size: 11, color: TEAL });
  y -= 20;
  y = drawLabelValue('Violation Type:', input.violationType.replace(/_/g, ' '), y);
  if (input.readValue != null) {
    y = drawLabelValue('Meter Read Value:', `${input.readValue} gallons`, y);
  }

  const desc = TYPE_DESCRIPTIONS[input.violationType] ?? 'Water use violation detected via AMI smart meter data.';
  const descLines = wrapText(desc, 492, 10, font);
  y -= 4;
  for (const line of descLines) {
    drawText(line, margin, y, { size: 10, color: GRAY });
    y -= 14;
  }
  y -= 8;
  drawLine(y);
  y -= 20;

  // ── Citation & Fee ───────────────────────────────────────────────

  drawText('CITATION & PENALTY', margin, y, { font: bold, size: 11, color: TEAL });
  y -= 20;
  const offenseLabel = input.priorCount === 0 ? '1st Offense' : input.priorCount === 1 ? '2nd Offense' : `${input.priorCount + 1}th Offense`;
  y = drawLabelValue('Offense:', offenseLabel, y);
  y = drawLabelValue('Citation Fee:', `$${feeAmount.toFixed(2)}`, y);
  y = drawLabelValue('Cure Period:', `${CURE_PERIOD_DAYS} calendar days`, y);
  y = drawLabelValue('Compliance Deadline:', fmtDate(complianceDate), y);
  y -= 4;

  const cureNote = wrapText(
    `You have ${CURE_PERIOD_DAYS} calendar days from the date of this notice to correct the violation and bring your property ` +
    `into compliance. If the violation is corrected within the cure period, the citation fee may be waived for a first offense. ` +
    `Failure to comply may result in additional citations and increased penalties.`,
    492, 9, font,
  );
  for (const line of cureNote) {
    drawText(line, margin, y, { size: 9, color: GRAY });
    y -= 13;
  }
  y -= 8;
  drawLine(y);
  y -= 20;

  // ── Payment & Contact ────────────────────────────────────────────

  drawText('PAYMENT & CONTACT', margin, y, { font: bold, size: 11, color: TEAL });
  y -= 20;
  const paymentLines = [
    'Payment may be made online at pinellascounty.org/utilities/pay or by mail to:',
    'Pinellas County Utilities — Water Conservation Enforcement',
    '333 Chestnut Street, Clearwater, FL 33756',
    '',
    'To dispute this notice or request a hearing, contact:',
    'Phone: (727) 464-4000   |   Email: waterconservation@pinellascounty.gov',
    `Reference Case Number: ${input.caseNumber}`,
  ];
  for (const line of paymentLines) {
    drawText(line, margin, y, { size: 9, color: line === '' ? BLACK : GRAY });
    y -= line === '' ? 8 : 13;
  }

  // ── Footer ───────────────────────────────────────────────────────

  y = 60;
  drawLine(y + 10);
  const footerLines = wrapText(
    `This notice is issued pursuant to Florida Administrative Code Rule 40D-22 (SWFWMD Water Shortage Restrictions) ` +
    `and Pinellas County Utilities Ordinance ${input.ordinanceRef ?? 'FAC 40D-22'}. Failure to comply with water use ` +
    `restrictions may result in progressive enforcement action including fines, utility service modifications, and ` +
    `referral to the Southwest Florida Water Management District. This document constitutes official notice.`,
    492, 7.5, font,
  );
  for (const line of footerLines) {
    drawText(line, margin, y, { size: 7.5, color: GRAY });
    y -= 10;
  }

  return doc.save();
}

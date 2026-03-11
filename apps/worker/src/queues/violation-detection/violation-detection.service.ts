import { Injectable, Logger } from '@nestjs/common';
import { PrismaService }      from '../../prisma/prisma.service';
import { BeaconService }      from '../../beacon/beacon.service';
import type { ViolationDetectionJobData } from './violation-detection.processor';

interface DetectionResult {
  violationsCreated: number;
  metersScanned: number;
  readsAnalyzed: number;
}

/**
 * Map irrigationDay / zoneCode labels to JS day-of-week numbers (0=Sun … 6=Sat).
 * SWFWMD Phase II: residential 2x/week based on address parity.
 */
const DAY_LABEL_TO_DOW: Record<string, number[]> = {
  ODD:       [3, 6],          // Wed, Sat
  EVEN:      [0, 4],          // Sun, Thu
  MON_THU:   [1, 4],          // Mon, Thu
  TUE_FRI:   [2, 5],          // Tue, Fri
  WED_SAT:   [3, 6],          // Wed, Sat
  RECLAIMED: [0, 1, 2, 3, 4, 5, 6], // all days
};

/** Parse "HH:MM" to { hour, minute } */
function parseTime(t: string): { hour: number; minute: number } {
  const [h, m] = t.split(':').map(Number);
  return { hour: h ?? 0, minute: m ?? 0 };
}

/** Convert Date to minutes-since-midnight */
function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

@Injectable()
export class ViolationDetectionService {
  private readonly logger = new Logger(ViolationDetectionService.name);

  constructor(
    private readonly prisma:  PrismaService,
    private readonly beacon:  BeaconService,
  ) {}

  // ── ConnectorJob lifecycle ──────────────────────────────────────

  async createConnectorJob(data: ViolationDetectionJobData) {
    return this.prisma.connectorJob.create({
      data: {
        jobType: 'VIOLATION_DETECTION',
        status:  'QUEUED',
        payload: JSON.stringify(data),
      },
    });
  }

  async markJobRunning(jobId: string) {
    return this.prisma.connectorJob.update({
      where: { id: jobId },
      data:  { status: 'RUNNING', startedAt: new Date(), attemptCount: { increment: 1 } },
    });
  }

  async markJobComplete(jobId: string, result: DetectionResult) {
    return this.prisma.connectorJob.update({
      where: { id: jobId },
      data:  { status: 'COMPLETE', completedAt: new Date(), result: JSON.stringify(result) },
    });
  }

  async markJobFailed(jobId: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return this.prisma.connectorJob.update({
      where: { id: jobId },
      data:  { status: 'FAILED', errorMessage: message },
    });
  }

  // ── Main detection pipeline ─────────────────────────────────────

  async runDetection(data: ViolationDetectionJobData): Promise<DetectionResult> {
    const since = data.sinceDate
      ? new Date(data.sinceDate)
      : new Date(Date.now() - (data.fetchSinceHours ?? 24) * 60 * 60 * 1000);
    const until = new Date();

    // 1. Get active accounts (optionally filtered by watering zone)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accountWhere: any = { isActive: true };
    if (data.wateringZone) {
      accountWhere.parcel = { wateringZone: data.wateringZone };
    }
    const accounts = await this.prisma.customerAccount.findMany({
      where:   accountWhere,
      include: { parcel: true },
    });

    if (accounts.length === 0) {
      this.logger.warn('No active accounts found for detection scan');
      return { violationsCreated: 0, metersScanned: 0, readsAnalyzed: 0 };
    }

    // 2. Fetch meter reads from Beacon AMI (or mock) and persist
    const accountIds = accounts.map((a) => a.accountId);
    await this.beacon.fetchAndPersistReads({ accountIds, since, until });

    // 3. Load watering zone rules
    const zones = await this.prisma.wateringZone.findMany({ where: { isActive: true } });
    const zoneMap = new Map(zones.map((z) => [z.zoneCode, z]));

    // 4. Query persisted reads in the detection window
    const reads = await this.prisma.meterRead.findMany({
      where: {
        accountId: { in: accountIds },
        readTime:  { gte: since, lte: until },
      },
      orderBy: { readTime: 'asc' },
    });

    this.logger.log(`Analyzing ${reads.length} reads for ${accounts.length} accounts`);

    // 5. Build account → parcel lookup
    const accountParcelMap = new Map(
      accounts.map((a) => [a.accountId, a.parcel]),
    );

    // 6. Detect violations
    let violationsCreated = 0;
    const seen = new Set<string>(); // dedup key: accountId|date|violationType

    for (const read of reads) {
      const flow = read.flow ? Number(read.flow) : 0;
      if (flow <= 0) continue; // No irrigation activity

      const parcel = accountParcelMap.get(read.accountId);
      if (!parcel?.wateringZone) continue;

      const zone = zoneMap.get(parcel.wateringZone);
      if (!zone) continue;

      // RECLAIMED zones have relaxed rules — skip detection
      if (parcel.wateringZone === 'RECLAIMED') continue;

      const readDate = read.readTime;
      const dow = readDate.getDay(); // 0=Sun
      const dateStr = readDate.toISOString().slice(0, 10);

      // Resolve allowed days for this parcel's irrigationDay
      const allowedDays = DAY_LABEL_TO_DOW[parcel.irrigationDay ?? parcel.wateringZone];
      if (!allowedDays) continue;

      // ── Check WRONG_DAY ──
      if (!allowedDays.includes(dow)) {
        const dedupKey = `${read.accountId}|${dateStr}|WRONG_DAY`;
        if (!seen.has(dedupKey)) {
          seen.add(dedupKey);
          const created = await this.createViolation({
            parcelId:      parcel.parcelId,
            accountId:     read.accountId,
            meterId:       read.meterId,
            violationType: 'WRONG_DAY',
            readValue:     Number(read.readValue),
            readTime:      readDate,
            wateringDay:   parcel.irrigationDay ?? undefined,
            wateringZone:  parcel.wateringZone ?? undefined,
          });
          if (created) violationsCreated++;
        }
        continue; // Wrong day implies wrong time too; don't double-count
      }

      // ── Check WRONG_TIME ──
      const readMinutes = minutesOfDay(readDate);
      const morningEnd  = zone.allowedEndTime
        ? parseTime(zone.allowedEndTime)
        : { hour: 10, minute: 0 };
      const eveningStart = { hour: 16, minute: 0 }; // After 4pm is allowed

      const morningEndMin  = morningEnd.hour * 60 + morningEnd.minute;
      const eveningStartMin = eveningStart.hour * 60 + eveningStart.minute;

      // Prohibited window: between morning cutoff and evening start
      if (readMinutes >= morningEndMin && readMinutes < eveningStartMin) {
        const dedupKey = `${read.accountId}|${dateStr}|WRONG_TIME`;
        if (!seen.has(dedupKey)) {
          seen.add(dedupKey);
          const created = await this.createViolation({
            parcelId:      parcel.parcelId,
            accountId:     read.accountId,
            meterId:       read.meterId,
            violationType: 'WRONG_TIME',
            readValue:     Number(read.readValue),
            readTime:      readDate,
            wateringDay:   parcel.irrigationDay ?? undefined,
            wateringZone:  parcel.wateringZone ?? undefined,
          });
          if (created) violationsCreated++;
        }
      }
    }

    this.logger.log(`Detection complete — ${violationsCreated} violations created from ${reads.length} reads`);

    return {
      violationsCreated,
      metersScanned: accounts.length,
      readsAnalyzed: reads.length,
    };
  }

  // ── Violation creation with case number + dedup ─────────────────

  private async createViolation(params: {
    parcelId:      string;
    accountId:     string;
    meterId:       string;
    violationType: string;
    readValue:     number;
    readTime:      Date;
    wateringDay?:  string;
    wateringZone?: string;
  }): Promise<boolean> {
    const dateStr = params.readTime.toISOString().slice(0, 10);

    // Check for existing violation same account + day + type
    const existing = await this.prisma.violation.findFirst({
      where: {
        accountId:     params.accountId,
        violationType: params.violationType as never,
        detectedAt:    {
          gte: new Date(dateStr + 'T00:00:00Z'),
          lt:  new Date(dateStr + 'T23:59:59Z'),
        },
      },
    });

    if (existing) return false;

    // Generate case number: PCU-YYYY-XXXX
    const year = new Date().getFullYear();
    const lastCase = await this.prisma.violation.findFirst({
      where:   { caseNumber: { startsWith: `PCU-${year}-` } },
      orderBy: { caseNumber: 'desc' },
      select:  { caseNumber: true },
    });

    let seq = 1;
    if (lastCase?.caseNumber) {
      const lastSeq = parseInt(lastCase.caseNumber.split('-')[2]);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const caseNumber = `PCU-${year}-${String(seq).padStart(4, '0')}`;

    await this.prisma.violation.create({
      data: {
        caseNumber,
        parcelId:      params.parcelId,
        accountId:     params.accountId,
        meterId:       params.meterId,
        violationType: params.violationType as never,
        status:        'DETECTED',
        detectedAt:    params.readTime,
        readValue:     params.readValue,
        wateringDay:   params.wateringDay ?? null,
        wateringZone:  params.wateringZone ?? null,
        ordinanceRef:  'FAC 40D-22',
        notes:         `Auto-detected by violation-detection worker`,
      },
    });

    this.logger.log(
      `Created violation ${caseNumber}: ${params.violationType} for account ${params.accountId}`,
    );

    return true;
  }
}

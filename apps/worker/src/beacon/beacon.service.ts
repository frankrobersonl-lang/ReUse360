import { Injectable, Logger } from '@nestjs/common';
import { PrismaService }      from '../prisma/prisma.service';
import type {
  BeaconReadRequest,
  BeaconMeterReadResponse,
  NormalizedMeterRead,
  BeaconFetchResult,
} from './beacon.types';

@Injectable()
export class BeaconService {
  private readonly logger = new Logger(BeaconService.name);
  private readonly isTestMode: boolean;
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly prisma: PrismaService) {
    this.isTestMode = process.env.BEACON_TEST_MODE === 'true';
    this.apiUrl     = process.env.BEACON_API_URL ?? '';
    this.apiKey     = process.env.BEACON_API_KEY ?? '';
  }

  /**
   * Fetch meter reads from Beacon AMI (or mock), persist to MeterRead table,
   * and log the attempt to ConnectorJob.
   */
  async fetchAndPersistReads(request: BeaconReadRequest): Promise<BeaconFetchResult> {
    const connectorJob = await this.prisma.connectorJob.create({
      data: {
        jobType: 'BEACON_RANGE_READ',
        status:  'QUEUED',
        payload: JSON.stringify({
          accountIds: request.accountIds.length,
          since: request.since.toISOString(),
          until: request.until.toISOString(),
        }),
      },
    });

    try {
      await this.prisma.connectorJob.update({
        where: { id: connectorJob.id },
        data:  { status: 'RUNNING', startedAt: new Date(), attemptCount: { increment: 1 } },
      });

      const reads = this.isTestMode
        ? await this.generateMockReads(request)
        : await this.fetchFromBeaconApi(request);

      const ingested = await this.persistReads(reads);

      const result: BeaconFetchResult = {
        accountsPolled: request.accountIds.length,
        readsIngested:  ingested,
        errors:         [],
      };

      await this.prisma.connectorJob.update({
        where: { id: connectorJob.id },
        data:  { status: 'COMPLETE', completedAt: new Date(), result: JSON.stringify(result) },
      });

      this.logger.log(
        `Beacon fetch complete — ${ingested} reads ingested for ${request.accountIds.length} accounts` +
        (this.isTestMode ? ' (TEST MODE)' : ''),
      );

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.connectorJob.update({
        where: { id: connectorJob.id },
        data:  { status: 'FAILED', errorMessage: message },
      });
      throw error;
    }
  }

  // ── Live Beacon API ─────────────────────────────────────────────

  private async fetchFromBeaconApi(request: BeaconReadRequest): Promise<NormalizedMeterRead[]> {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error('BEACON_API_URL and BEACON_API_KEY are required when BEACON_TEST_MODE is not true');
    }

    const url = new URL('/api/v1/reads/range', this.apiUrl);
    url.searchParams.set('since', request.since.toISOString());
    url.searchParams.set('until', request.until.toISOString());
    for (const id of request.accountIds) {
      url.searchParams.append('accountId', id);
    }

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept':        'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Beacon API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as BeaconMeterReadResponse[];
    return data.map((r) => this.normalizeRead(r));
  }

  private normalizeRead(raw: BeaconMeterReadResponse): NormalizedMeterRead {
    return {
      accountId:  raw.accountId,
      meterId:    raw.meterId,
      readValue:  raw.readValue,
      readTime:   new Date(raw.readTime),
      flow:       raw.flow ?? null,
      flowUnit:   raw.flowUnit ?? 'gallons',
      flowTime:   raw.flowTime ? new Date(raw.flowTime) : null,
      label:      raw.label ?? null,
      resolution: raw.resolution ?? 'hourly',
    };
  }

  // ── Mock Data ───────────────────────────────────────────────────

  private async generateMockReads(request: BeaconReadRequest): Promise<NormalizedMeterRead[]> {
    this.logger.warn('BEACON_TEST_MODE=true — generating mock meter reads');

    const accounts = await this.prisma.customerAccount.findMany({
      where: {
        accountId: { in: request.accountIds },
        isActive:  true,
      },
    });

    const reads: NormalizedMeterRead[] = [];
    const now = new Date();
    const daysBack = Math.ceil((now.getTime() - request.since.getTime()) / (1000 * 60 * 60 * 24));

    for (const acct of accounts) {
      let cumulativeRead = 10000 + Math.random() * 5000;

      for (let d = 0; d < daysBack; d++) {
        const day = new Date(now);
        day.setDate(day.getDate() - d);

        // Generate 2-4 reads per day at various times
        const hours = d % 3 === 0
          ? [6, 7, 12, 14]   // Every 3rd day: include violating times (noon, 2PM)
          : [5, 6, 7];       // Normal: compliant early-morning reads

        for (const hour of hours) {
          const readTime = new Date(day);
          readTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

          if (readTime < request.since || readTime > request.until) continue;

          const flow = 10 + Math.random() * 50; // 10-60 gallons
          cumulativeRead += flow;

          reads.push({
            accountId:  acct.accountId,
            meterId:    acct.meterId,
            readValue:  Math.round(cumulativeRead * 100) / 100,
            readTime,
            flow:       Math.round(flow * 100) / 100,
            flowUnit:   'gallons',
            flowTime:   readTime,
            label:      acct.isReclaimed ? 'reclaimed' : 'potable',
            resolution: 'hourly',
          });
        }
      }
    }

    this.logger.log(`Mock: generated ${reads.length} reads for ${accounts.length} accounts`);
    return reads;
  }

  // ── Persistence ─────────────────────────────────────────────────

  private async persistReads(reads: NormalizedMeterRead[]): Promise<number> {
    let ingested = 0;

    for (const read of reads) {
      // Upsert by meterId + readTime to avoid duplicates
      const existing = await this.prisma.meterRead.findFirst({
        where: { meterId: read.meterId, readTime: read.readTime },
      });

      if (!existing) {
        await this.prisma.meterRead.create({
          data: {
            accountId: read.accountId,
            meterId:   read.meterId,
            readValue: read.readValue,
            readTime:  read.readTime,
            flow:      read.flow,
            flowUnit:  read.flowUnit,
            flowTime:  read.flowTime,
            label:     read.label,
            resolution: read.resolution,
          },
        });
        ingested++;
      }
    }

    return ingested;
  }
}

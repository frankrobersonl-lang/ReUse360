import { Injectable, Logger } from '@nestjs/common';
import { PrismaService }      from '../../prisma/prisma.service';
import type { SrSyncJobData } from './sr-sync.processor';

interface SyncResult {
  synced: number;
  resolved: number;
}

@Injectable()
export class SrSyncService {
  private readonly logger = new Logger(SrSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createConnectorJob(data: SrSyncJobData) {
    return this.prisma.connectorJob.create({
      data: {
        jobType: 'CITYWORKS_SR_SYNC',
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

  async markJobComplete(jobId: string, result: SyncResult) {
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

  async syncServiceRequests(data: SrSyncJobData): Promise<SyncResult> {
    // TODO: Implement actual Cityworks sync
    // 1. Query violations with SR_CREATED status and non-null cityworksSrId
    // 2. For each, call Cityworks REST API to check SR status
    // 3. If resolved in Cityworks, update violation status to RESOLVED

    const where: Record<string, unknown> = {
      status:       'SR_CREATED',
      cityworksSrId: { not: null },
    };
    if (data.violationId) {
      where.id = data.violationId;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const violations = await this.prisma.violation.findMany({ where: where as any });

    this.logger.warn(`SR sync stub — found ${violations.length} violations with open SRs`);

    // TODO: Replace with real Cityworks API calls
    // const isTestMode = process.env.CITYWORKS_TEST_MODE === 'true';

    return { synced: violations.length, resolved: 0 };
  }
}

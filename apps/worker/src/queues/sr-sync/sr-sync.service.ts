import { Injectable, Logger } from '@nestjs/common';
import { PrismaService }      from '../../prisma/prisma.service';
import { CityworksService }   from '../../cityworks/cityworks.service';
import type { SrSyncJobData } from './sr-sync.processor';
import type { SrSyncResult }  from '../../cityworks/cityworks.types';

@Injectable()
export class SrSyncService {
  private readonly logger = new Logger(SrSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cityworks: CityworksService,
  ) {}

  // ── ConnectorJob lifecycle ─────────────────────────────────────

  async createConnectorJob(data: SrSyncJobData) {
    return this.prisma.connectorJob.create({
      data: {
        jobType: data.action === 'create' ? 'CITYWORKS_SR_CREATE' : 'CITYWORKS_SR_SYNC',
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

  async markJobComplete(jobId: string, result: SrSyncResult) {
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

  // ── SR Creation ────────────────────────────────────────────────

  async createServiceRequest(violationId: string): Promise<SrSyncResult> {
    const result: SrSyncResult = { created: 0, synced: 0, resolved: 0, errors: [] };

    const violation = await this.prisma.violation.findUnique({
      where: { id: violationId },
      include: {
        account: {
          select: { serviceAddress: true, firstName: true, lastName: true },
        },
      },
    });

    if (!violation) {
      result.errors.push(`Violation ${violationId} not found`);
      return result;
    }

    if (!['CONFIRMED', 'NOTIFIED'].includes(violation.status)) {
      result.errors.push(`Violation ${violationId} status is ${violation.status}, expected CONFIRMED or NOTIFIED`);
      return result;
    }

    if (violation.cityworksSrId) {
      result.errors.push(`Violation ${violationId} already has SR ${violation.cityworksSrId}`);
      return result;
    }

    const srResult = await this.cityworks.createServiceRequest({
      id:            violation.id,
      caseNumber:    violation.caseNumber,
      violationType: violation.violationType,
      wateringDay:   violation.wateringDay,
      wateringZone:  violation.wateringZone,
      ordinanceRef:  violation.ordinanceRef,
      account:       violation.account,
    });

    if (srResult.success) {
      await this.prisma.violation.update({
        where: { id: violationId },
        data:  { cityworksSrId: srResult.cityworksSrId, status: 'SR_CREATED' },
      });
      result.created = 1;
      this.logger.log(`SR ${srResult.cityworksSrId} created for violation ${violation.caseNumber ?? violationId}`);
    } else {
      result.errors.push(srResult.error ?? 'Unknown SR creation error');
    }

    return result;
  }

  // ── SR Status Sync ─────────────────────────────────────────────

  async syncServiceRequests(violationId?: string): Promise<SrSyncResult> {
    const result: SrSyncResult = { created: 0, synced: 0, resolved: 0, errors: [] };

    const where: Record<string, unknown> = {
      status:        'SR_CREATED',
      cityworksSrId: { not: null },
    };
    if (violationId) {
      where.id = violationId;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const violations = await this.prisma.violation.findMany({ where: where as any });

    this.logger.log(`Syncing ${violations.length} open SR(s)`);

    for (const violation of violations) {
      try {
        const status = await this.cityworks.getSrStatus(violation.cityworksSrId!);
        result.synced++;

        if (status.Status === 'CLOSED' || status.Status === 'CANCELLED') {
          await this.prisma.violation.update({
            where: { id: violation.id },
            data: {
              status:     'RESOLVED',
              resolvedAt: status.DateClosed ? new Date(status.DateClosed) : new Date(),
              notes:      violation.notes
                ? `${violation.notes}\nCityworks SR resolved: ${status.Resolution ?? status.Status}`
                : `Cityworks SR resolved: ${status.Resolution ?? status.Status}`,
            },
          });
          result.resolved++;
          this.logger.log(
            `Violation ${violation.caseNumber ?? violation.id} resolved — SR ${violation.cityworksSrId} ${status.Status}`,
          );
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        result.errors.push(`SR ${violation.cityworksSrId}: ${msg}`);
        this.logger.error(`Failed to sync SR ${violation.cityworksSrId}: ${msg}`);
      }
    }

    return result;
  }
}

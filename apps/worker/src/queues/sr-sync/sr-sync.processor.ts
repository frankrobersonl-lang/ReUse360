import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger }               from '@nestjs/common';
import { Job }                  from 'bullmq';
import { QUEUE_NAMES }          from '../queue-names';
import { SrSyncService }        from './sr-sync.service';

export interface SrSyncJobData {
  /** Sync a specific violation's SR, or poll all open SRs if omitted */
  violationId?: string;
}

@Processor(QUEUE_NAMES.SR_SYNC)
export class SrSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SrSyncProcessor.name);

  constructor(private readonly service: SrSyncService) {
    super();
  }

  async process(job: Job<SrSyncJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id} — Cityworks SR sync`);

    const connectorJob = await this.service.createConnectorJob(job.data);

    try {
      await this.service.markJobRunning(connectorJob.id);

      // TODO: 1. Find violations with status SR_CREATED and a cityworksSrId
      // TODO: 2. For each, call Cityworks REST API to get SR status
      // TODO: 3. If Cityworks reports SR closed/resolved, update violation to RESOLVED
      // TODO: 4. Log sync results to ConnectorJob.result

      const result = await this.service.syncServiceRequests(job.data);

      await this.service.markJobComplete(connectorJob.id, result);
      this.logger.log(`Job ${job.id} complete — synced ${result.synced} SRs`);
    } catch (error) {
      await this.service.markJobFailed(connectorJob.id, error);
      throw error;
    }
  }
}

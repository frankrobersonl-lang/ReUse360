import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger }               from '@nestjs/common';
import { Job }                  from 'bullmq';
import { QUEUE_NAMES }          from '../queue-names';
import { withJobTimeout }       from '../job-timeout';
import { SrSyncService }        from './sr-sync.service';

export interface SrSyncJobData {
  /** 'create' = create SR for a violation, 'sync' = poll status of open SRs */
  action: 'create' | 'sync';
  /** Required for 'create', optional for 'sync' (sync specific violation) */
  violationId?: string;
}

@Processor(QUEUE_NAMES.SR_SYNC)
export class SrSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SrSyncProcessor.name);

  constructor(private readonly service: SrSyncService) {
    super();
  }

  async process(job: Job<SrSyncJobData>): Promise<void> {
    const { action } = job.data;
    this.logger.log(`Processing job ${job.id} — Cityworks SR ${action}`);

    const connectorJob = await this.service.createConnectorJob(job.data);

    try {
      await this.service.markJobRunning(connectorJob.id);

      const result = await withJobTimeout(
        () => action === 'create'
          ? this.service.createServiceRequest(job.data.violationId!)
          : this.service.syncServiceRequests(job.data.violationId),
        job.id,
      );

      await this.service.markJobComplete(connectorJob.id, result);
      this.logger.log(
        `Job ${job.id} complete — created: ${result.created}, synced: ${result.synced}, resolved: ${result.resolved}`,
      );
    } catch (error) {
      await this.service.markJobFailed(connectorJob.id, error);
      throw error;
    }
  }
}

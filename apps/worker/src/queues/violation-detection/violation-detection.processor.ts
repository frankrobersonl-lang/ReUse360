import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger }               from '@nestjs/common';
import { Job }                  from 'bullmq';
import { QUEUE_NAMES }          from '../queue-names';
import { withJobTimeout }       from '../job-timeout';
import { ViolationDetectionService } from './violation-detection.service';

export interface ViolationDetectionJobData {
  /** Optional: restrict scan to a specific watering zone */
  wateringZone?: string;
  /** Optional: restrict to reads after this ISO date */
  sinceDate?: string;
  /** How many hours back to fetch reads (default: 24) */
  fetchSinceHours?: number;
}

@Processor(QUEUE_NAMES.VIOLATION_DETECTION)
export class ViolationDetectionProcessor extends WorkerHost {
  private readonly logger = new Logger(ViolationDetectionProcessor.name);

  constructor(private readonly service: ViolationDetectionService) {
    super();
  }

  async process(job: Job<ViolationDetectionJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id} — violation detection scan`);

    const connectorJob = await this.service.createConnectorJob(job.data);

    try {
      await this.service.markJobRunning(connectorJob.id);

      const result = await withJobTimeout(
        () => this.service.runDetection(job.data),
        job.id,
      );

      await this.service.markJobComplete(connectorJob.id, result);
      this.logger.log(`Job ${job.id} complete — ${result.violationsCreated} violations detected`);
    } catch (error) {
      await this.service.markJobFailed(connectorJob.id, error);
      throw error; // Re-throw so BullMQ handles retries
    }
  }
}

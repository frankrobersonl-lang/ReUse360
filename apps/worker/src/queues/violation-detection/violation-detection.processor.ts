import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger }               from '@nestjs/common';
import { Job }                  from 'bullmq';
import { QUEUE_NAMES }          from '../queue-names';
import { ViolationDetectionService } from './violation-detection.service';

export interface ViolationDetectionJobData {
  /** Optional: restrict scan to a specific watering zone */
  wateringZone?: string;
  /** Optional: restrict to reads after this ISO date */
  sinceDate?: string;
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

      // TODO: 1. Fetch recent MeterReads from DB (last N hours)
      // TODO: 2. Cross-reference against WateringZone rules (allowed days/times)
      // TODO: 3. Flag reads outside allowed windows as WRONG_DAY or WRONG_TIME
      // TODO: 4. Detect continuous flow (>= 24h) as CONTINUOUS_FLOW / LEAK_DETECTED
      // TODO: 5. Detect excessive usage above threshold as EXCESSIVE_USAGE
      // TODO: 6. Create Violation records with status DETECTED
      // TODO: 7. Queue notification-dispatch jobs for each new violation

      const result = await this.service.runDetection(job.data);

      await this.service.markJobComplete(connectorJob.id, result);
      this.logger.log(`Job ${job.id} complete — ${result.violationsCreated} violations detected`);
    } catch (error) {
      await this.service.markJobFailed(connectorJob.id, error);
      throw error; // Re-throw so BullMQ handles retries
    }
  }
}

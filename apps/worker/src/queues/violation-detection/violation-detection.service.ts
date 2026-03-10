import { Injectable, Logger } from '@nestjs/common';
import { PrismaService }      from '../../prisma/prisma.service';
import type { ViolationDetectionJobData } from './violation-detection.processor';

interface DetectionResult {
  violationsCreated: number;
  metersScanned: number;
}

@Injectable()
export class ViolationDetectionService {
  private readonly logger = new Logger(ViolationDetectionService.name);

  constructor(private readonly prisma: PrismaService) {}

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

  async runDetection(_data: ViolationDetectionJobData): Promise<DetectionResult> {
    // TODO: Implement actual detection logic
    // 1. Query MeterReads from the last scan window
    // 2. Join with WateringZone rules for each parcel
    // 3. Compare read times against allowed watering windows
    // 4. Create Violation records for anomalies

    this.logger.warn('runDetection is a stub — implement actual AMI analysis');
    return { violationsCreated: 0, metersScanned: 0 };
  }
}

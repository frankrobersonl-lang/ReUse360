import { Injectable, Logger } from '@nestjs/common';
import { PrismaService }      from '../../prisma/prisma.service';
import type { NotificationJobData } from './notification-dispatch.processor';

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createConnectorJob(data: NotificationJobData) {
    return this.prisma.connectorJob.create({
      data: {
        jobType: 'ALERT_DISPATCH',
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

  async markJobComplete(jobId: string) {
    return this.prisma.connectorJob.update({
      where: { id: jobId },
      data:  { status: 'COMPLETE', completedAt: new Date() },
    });
  }

  async markJobFailed(jobId: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return this.prisma.connectorJob.update({
      where: { id: jobId },
      data:  { status: 'FAILED', errorMessage: message },
    });
  }

  async dispatch(alertId: string): Promise<void> {
    const alert = await this.prisma.alert.findUnique({
      where:   { id: alertId },
      include: { account: true },
    });

    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    // TODO: Implement actual dispatch by channel
    switch (alert.channel) {
      case 'EMAIL':
        // TODO: Send email via SMTP/SendGrid
        this.logger.warn(`EMAIL dispatch stub for alert ${alertId}`);
        break;
      case 'SMS':
        // TODO: Send SMS via Twilio
        this.logger.warn(`SMS dispatch stub for alert ${alertId}`);
        break;
      case 'PUSH':
        // TODO: Send push notification
        this.logger.warn(`PUSH dispatch stub for alert ${alertId}`);
        break;
      case 'IN_APP':
        this.logger.log(`IN_APP alert ${alertId} — marking sent`);
        break;
    }

    // Mark alert as sent
    await this.prisma.alert.update({
      where: { id: alertId },
      data:  { sentAt: new Date() },
    });

    // If violation-linked and status is CONFIRMED, advance to NOTIFIED
    if (alert.violationId) {
      const violation = await this.prisma.violation.findUnique({
        where: { id: alert.violationId },
      });
      if (violation && violation.status === 'CONFIRMED') {
        await this.prisma.violation.update({
          where: { id: alert.violationId },
          data:  { status: 'NOTIFIED' },
        });
      }
    }
  }
}

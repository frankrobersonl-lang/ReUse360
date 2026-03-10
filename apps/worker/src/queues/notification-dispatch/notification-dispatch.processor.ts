import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger }               from '@nestjs/common';
import { Job }                  from 'bullmq';
import { QUEUE_NAMES }          from '../queue-names';
import { NotificationDispatchService } from './notification-dispatch.service';

export interface NotificationJobData {
  alertId: string;
}

@Processor(QUEUE_NAMES.NOTIFICATION_DISPATCH)
export class NotificationDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationDispatchProcessor.name);

  constructor(private readonly service: NotificationDispatchService) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id} — dispatching alert ${job.data.alertId}`);

    const connectorJob = await this.service.createConnectorJob(job.data);

    try {
      await this.service.markJobRunning(connectorJob.id);

      // TODO: 1. Load Alert record by alertId
      // TODO: 2. Load associated CustomerAccount for contact details
      // TODO: 3. Switch on alert.channel (EMAIL, SMS, PUSH, IN_APP)
      // TODO: 4. For EMAIL: send via SMTP/SendGrid/SES
      // TODO: 5. For IN_APP: mark sentAt — frontend polls
      // TODO: 6. Update Alert.sentAt on success
      // TODO: 7. If violation-linked, update Violation status to NOTIFIED

      await this.service.dispatch(job.data.alertId);

      await this.service.markJobComplete(connectorJob.id);
      this.logger.log(`Job ${job.id} complete — alert dispatched`);
    } catch (error) {
      await this.service.markJobFailed(connectorJob.id, error);
      throw error;
    }
  }
}

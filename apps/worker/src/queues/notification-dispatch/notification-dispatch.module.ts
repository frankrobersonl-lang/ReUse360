import { Module }      from '@nestjs/common';
import { BullModule }  from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../queue-names';
import { NotificationDispatchProcessor } from './notification-dispatch.processor';
import { NotificationDispatchService }   from './notification-dispatch.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.NOTIFICATION_DISPATCH,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3_000 },
        removeOnComplete: { count: 200 },
        removeOnFail:     { count: 500 },
      },
    }),
  ],
  providers: [NotificationDispatchProcessor, NotificationDispatchService],
})
export class NotificationDispatchModule {}

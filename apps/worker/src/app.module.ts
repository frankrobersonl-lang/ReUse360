import { Module }     from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { redisConnection }            from './config/redis.config';
import { PrismaModule }               from './prisma/prisma.module';
import { HealthModule }               from './health/health.module';
import { ViolationDetectionModule }   from './queues/violation-detection/violation-detection.module';
import { NotificationDispatchModule } from './queues/notification-dispatch/notification-dispatch.module';
import { SrSyncModule }               from './queues/sr-sync/sr-sync.module';

@Module({
  imports: [
    BullModule.forRoot({ connection: redisConnection }),
    PrismaModule,
    HealthModule,
    ViolationDetectionModule,
    NotificationDispatchModule,
    SrSyncModule,
  ],
})
export class AppModule {}

import { Module }      from '@nestjs/common';
import { BullModule }  from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../queue-names';
import { CityworksModule } from '../../cityworks/cityworks.module';
import { SrSyncProcessor } from './sr-sync.processor';
import { SrSyncService }   from './sr-sync.service';

@Module({
  imports: [
    CityworksModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.SR_SYNC,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: { count: 100 },
        removeOnFail:     { count: 500 },
      },
    }),
  ],
  providers: [SrSyncProcessor, SrSyncService],
})
export class SrSyncModule {}

import { Module }      from '@nestjs/common';
import { BullModule }  from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../queue-names';
import { BeaconModule } from '../../beacon/beacon.module';
import { ViolationDetectionProcessor } from './violation-detection.processor';
import { ViolationDetectionService }   from './violation-detection.service';

@Module({
  imports: [
    BeaconModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.VIOLATION_DETECTION,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 100 },
        removeOnFail:     { count: 500 },
      },
    }),
  ],
  providers: [ViolationDetectionProcessor, ViolationDetectionService],
})
export class ViolationDetectionModule {}

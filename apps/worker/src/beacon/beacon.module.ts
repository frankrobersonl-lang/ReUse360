import { Module }        from '@nestjs/common';
import { BeaconService } from './beacon.service';

@Module({
  providers: [BeaconService],
  exports:   [BeaconService],
})
export class BeaconModule {}

import { Module } from '@nestjs/common';
import { CityworksService } from './cityworks.service';

@Module({
  providers: [CityworksService],
  exports:   [CityworksService],
})
export class CityworksModule {}

import { Module } from '@nestjs/common';
import { GarmentVisionService } from './garment-vision.service';

@Module({
  providers: [GarmentVisionService],
  exports: [GarmentVisionService],
})
export class AiModule {}

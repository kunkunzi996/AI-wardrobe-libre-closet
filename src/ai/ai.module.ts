import { Module } from '@nestjs/common';
import { FileModule } from '../file/file.module';
import {
  GARMENT_VISION_FETCH,
  GarmentVisionService,
} from './garment-vision.service';
import { OUTFIT_AI_FETCH, OutfitAiService } from './outfit-ai.service';
import {
  GARMENT_IMAGE_FETCH,
  GarmentImageService,
} from './garment-image.service';

@Module({
  imports: [FileModule],
  providers: [
    GarmentVisionService,
    OutfitAiService,
    GarmentImageService,
    {
      provide: GARMENT_IMAGE_FETCH,
      useValue: globalThis.fetch.bind(globalThis),
    },
    {
      provide: OUTFIT_AI_FETCH,
      useValue: globalThis.fetch.bind(globalThis),
    },
    {
      provide: GARMENT_VISION_FETCH,
      useValue: globalThis.fetch.bind(globalThis),
    },
  ],
  exports: [GarmentVisionService, OutfitAiService, GarmentImageService],
})
export class AiModule {}

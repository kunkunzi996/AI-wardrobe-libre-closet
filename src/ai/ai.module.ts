import { Module } from '@nestjs/common';
import { GarmentVisionService } from './garment-vision.service';
import { OUTFIT_AI_FETCH, OutfitAiService } from './outfit-ai.service';

@Module({
  providers: [
    GarmentVisionService,
    OutfitAiService,
    {
      provide: OUTFIT_AI_FETCH,
      useValue: globalThis.fetch.bind(globalThis),
    },
  ],
  exports: [GarmentVisionService, OutfitAiService],
})
export class AiModule {}

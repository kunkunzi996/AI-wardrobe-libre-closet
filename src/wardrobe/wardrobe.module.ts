import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Garment } from '../dal/entity/garment.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import { User } from '../dal/entity/user.entity';
import { File } from '../dal/entity/file.entity';
import { FileModule } from '../file/file.module';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { GarmentService } from './garment.service';
import { OutfitService } from './outfit.service';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { WardrobeController } from './wardrobe.controller';
import { OutfitController } from './outfit.controller';
import { WardrobeRecommendationService } from './recommendation/wardrobe-recommendation.service';
import { OutfitGeneratorService } from './recommendation/outfit-generator.service';
import { WardrobeAnalyticsService } from './analytics/wardrobe-analytics.service';
import { AnalyticsController } from './analytics.controller';
import { MiniappOutfitController } from './miniapp-outfit.controller';
import { MiniappWardrobeController } from './miniapp-wardrobe.controller';
import { MiniappDailyOutfitController } from './miniapp-daily-outfit.controller';

@Module({
  imports: [
    AuthModule,
    AiModule,
    FileModule,
    MikroOrmModule.forFeature([Garment, Outfit, OutfitCalendar, User, File]),
  ],
  controllers: [
    WardrobeController,
    OutfitController,
    CalendarController,
    AnalyticsController,
    MiniappOutfitController,
    MiniappWardrobeController,
    MiniappDailyOutfitController,
  ],
  providers: [
    GarmentService,
    OutfitService,
    CalendarService,
    WardrobeRecommendationService,
    OutfitGeneratorService,
    WardrobeAnalyticsService,
  ],
  exports: [
    GarmentService,
    OutfitService,
    CalendarService,
    WardrobeRecommendationService,
    OutfitGeneratorService,
    WardrobeAnalyticsService,
  ],
})
export class WardrobeModule {}

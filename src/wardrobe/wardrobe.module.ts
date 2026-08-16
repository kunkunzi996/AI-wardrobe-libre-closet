import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Garment } from '../dal/entity/garment.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import { OutfitFeedback } from '../dal/entity/outfit-feedback.entity';
import { User } from '../dal/entity/user.entity';
import { File } from '../dal/entity/file.entity';
import { FileModule } from '../file/file.module';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { WeatherModule } from '../weather/weather.module';
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
import { MiniappProfileController } from './miniapp-profile.controller';
import { MiniappProfileService } from './miniapp-profile.service';
import { MiniappOutfitFeedbackController } from './miniapp-outfit-feedback.controller';
import { OutfitFeedbackService } from './outfit-feedback.service';
import { MiniappAdminController } from './miniapp-admin.controller';
import { MiniappAdminService } from './miniapp-admin.service';

@Module({
  imports: [
    AuthModule,
    AiModule,
    WeatherModule,
    FileModule,
    MikroOrmModule.forFeature([
      Garment,
      Outfit,
      OutfitCalendar,
      OutfitFeedback,
      User,
      File,
    ]),
  ],
  controllers: [
    WardrobeController,
    OutfitController,
    CalendarController,
    AnalyticsController,
    MiniappOutfitController,
    MiniappWardrobeController,
    MiniappDailyOutfitController,
    MiniappProfileController,
    MiniappOutfitFeedbackController,
    MiniappAdminController,
  ],
  providers: [
    GarmentService,
    OutfitService,
    CalendarService,
    WardrobeRecommendationService,
    OutfitGeneratorService,
    WardrobeAnalyticsService,
    MiniappProfileService,
    OutfitFeedbackService,
    MiniappAdminService,
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

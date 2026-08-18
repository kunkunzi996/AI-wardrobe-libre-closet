import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  TENCENT_WEATHER_FETCH,
  TencentWeatherService,
} from './tencent-weather.service';

@Module({
  imports: [ConfigModule],
  providers: [
    TencentWeatherService,
    {
      provide: TENCENT_WEATHER_FETCH,
      useValue: globalThis.fetch.bind(globalThis),
    },
  ],
  exports: [TencentWeatherService, TENCENT_WEATHER_FETCH],
})
export class WeatherModule {}

import type { WeatherRequestInput } from '../../weather/tencent-weather.service';

export class MiniappOutfitRecommendDto {
  requestText?: string;
  coreGarmentId?: number | string;
  weather?: WeatherRequestInput;
}

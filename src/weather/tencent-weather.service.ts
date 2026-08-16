import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type WeatherRequestInput =
  | {
      mode: 'auto';
      latitude: number;
      longitude: number;
    }
  | {
      mode: 'manual';
      city: string;
    }
  | {
      mode: 'unavailable';
    };

export interface OutfitTemperaturePoint {
  timestamp: string;
  temperatureC: number;
}

export interface OutfitTemperatureContext {
  status: 'available' | 'unavailable';
  city?: string;
  currentC?: number;
  hourly: OutfitTemperaturePoint[];
  minC?: number;
  maxC?: number;
  reason?: string;
}

export interface WeatherFetchResponse {
  ok: boolean;
  status?: number;
  json(): Promise<unknown>;
}

export type WeatherFetch = (
  input: string,
  init?: RequestInit,
) => Promise<WeatherFetchResponse>;

export const TENCENT_WEATHER_FETCH = 'TENCENT_WEATHER_FETCH';

type NormalizedWeatherRequest =
  | {
      mode: 'auto';
      latitude: number;
      longitude: number;
    }
  | {
      mode: 'manual';
      city: string;
    };

type WeatherCacheEntry = {
  expiresAt: number;
  context: OutfitTemperatureContext;
};

type RecordValue = Record<string, unknown>;

const CACHE_TTL_MS = 15 * 60 * 1000;
const FUTURE_HOUR_TOLERANCE_MS = 5 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_BASE_URL = 'https://apis.map.qq.com';

@Injectable()
export class TencentWeatherService {
  private readonly cache = new Map<string, WeatherCacheEntry>();

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(TENCENT_WEATHER_FETCH)
    private readonly fetchImpl: WeatherFetch = globalThis.fetch.bind(
      globalThis,
    ) as WeatherFetch,
  ) {}

  async getContext(
    input: WeatherRequestInput,
  ): Promise<OutfitTemperatureContext> {
    if (input.mode === 'unavailable') {
      return this.unavailable('本次未使用实时温度。');
    }

    const request = this.normalizeRequest(input);
    if (!request) {
      return this.unavailable('天气位置不可用。');
    }

    const apiKey = this.configValue<string>('TENCENT_LBS_KEY')?.trim();
    if (!apiKey) {
      return this.unavailable('天气服务暂未配置。');
    }

    const cacheKey = this.cacheKey(request);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.context;
    }
    if (cached) {
      this.cache.delete(cacheKey);
    }

    const controller = new AbortController();
    let rejectTimeout: ((reason?: unknown) => void) | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      rejectTimeout = reject;
    });
    const timeout = setTimeout(() => {
      controller.abort();
      rejectTimeout?.(new Error('weather request timeout'));
    }, this.timeoutMs());

    try {
      const response = await Promise.race([
        this.fetchImpl(this.requestUrl(request, apiKey), {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        }),
        timeoutPromise,
      ]);

      if (!response?.ok) {
        return this.unavailable('天气服务暂时不可用。');
      }

      const payload = await response.json();
      const context = this.parseProviderPayload(
        payload,
        request.mode === 'manual' ? request.city : undefined,
      );
      if (!context) {
        return this.unavailable('天气数据暂时不可用。');
      }

      this.cache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        context,
      });
      return context;
    } catch {
      return this.unavailable('天气服务暂时不可用。');
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeRequest(
    input: Exclude<WeatherRequestInput, { mode: 'unavailable' }>,
  ): NormalizedWeatherRequest | undefined {
    if (input.mode === 'manual') {
      const city = input.city.trim();
      return city ? { mode: 'manual', city } : undefined;
    }

    if (
      !Number.isFinite(input.latitude) ||
      !Number.isFinite(input.longitude) ||
      input.latitude < -90 ||
      input.latitude > 90 ||
      input.longitude < -180 ||
      input.longitude > 180
    ) {
      return undefined;
    }

    return {
      mode: 'auto',
      latitude: this.roundCoordinate(input.latitude),
      longitude: this.roundCoordinate(input.longitude),
    };
  }

  private roundCoordinate(value: number): number {
    const rounded = Number(value.toFixed(2));
    return Object.is(rounded, -0) ? 0 : rounded;
  }

  private cacheKey(request: NormalizedWeatherRequest): string {
    if (request.mode === 'manual') {
      return `manual:${request.city.toLocaleLowerCase('zh-CN')}`;
    }

    return `auto:${request.latitude.toFixed(2)},${request.longitude.toFixed(2)}`;
  }

  private requestUrl(
    request: NormalizedWeatherRequest,
    apiKey: string,
  ): string {
    const url = new URL('/ws/weather/v1/', this.baseUrl());
    url.searchParams.set('key', apiKey);
    url.searchParams.set('output', 'json');
    if (request.mode === 'manual') {
      url.searchParams.set('city', request.city);
    } else {
      url.searchParams.set(
        'location',
        `${request.latitude.toFixed(2)},${request.longitude.toFixed(2)}`,
      );
    }
    return url.toString();
  }

  private parseProviderPayload(
    payload: unknown,
    fallbackCity?: string,
  ): OutfitTemperatureContext | undefined {
    const root = this.asRecord(payload);
    if (!root || this.hasProviderError(root)) {
      return undefined;
    }

    const result =
      this.asRecord(root.result) ?? this.asRecord(root.data) ?? root;
    if (!result) {
      return undefined;
    }

    const realtime =
      this.asRecord(result.realtime) ??
      this.asRecord(result.current) ??
      this.asRecord(result.now) ??
      {};
    const currentC = this.firstNumber(
      realtime.temperatureC,
      realtime.temperature,
      result.temperatureC,
      result.temperature,
    );
    if (currentC === undefined) {
      return undefined;
    }

    const forecast = this.asRecord(result.forecast);
    const rawHourly =
      this.asArray(result.hourly) ??
      this.asArray(result.hourlyForecast) ??
      this.asArray(result.forecastHourly) ??
      this.asArray(forecast?.hourly);
    if (!rawHourly) {
      return undefined;
    }

    const hourly = this.normalizeHourly(rawHourly);
    if (hourly.length < 8) {
      return undefined;
    }

    const city =
      this.asString(result.city) ??
      this.asString(this.asRecord(result.address_component)?.city) ??
      this.asString(this.asRecord(result.address)?.city) ??
      fallbackCity;
    if (!city) {
      return undefined;
    }

    const temperatures = hourly.map((point) => point.temperatureC);
    return {
      status: 'available',
      city,
      currentC,
      hourly,
      minC: Math.min(...temperatures),
      maxC: Math.max(...temperatures),
    };
  }

  private normalizeHourly(rawHourly: unknown[]): OutfitTemperaturePoint[] {
    const parsed = rawHourly
      .map((value) => {
        const point = this.asRecord(value);
        if (!point) return undefined;

        const temperatureC = this.firstNumber(
          point.temperatureC,
          point.temperature,
          point.temp,
        );
        if (temperatureC === undefined) return undefined;

        const timestamp = this.normalizeTimestamp(
          point.timestamp ?? point.time ?? point.datetime ?? point.forecastTime,
        );
        return timestamp ? { timestamp, temperatureC } : undefined;
      })
      .filter((point): point is OutfitTemperaturePoint => Boolean(point));

    const threshold = Date.now() - FUTURE_HOUR_TOLERANCE_MS;
    const future = parsed
      .filter((point) => Date.parse(point.timestamp) >= threshold)
      .sort(
        (left, right) =>
          Date.parse(left.timestamp) - Date.parse(right.timestamp),
      );
    return future.slice(0, 8);
  }

  private normalizeTimestamp(value: unknown): string | undefined {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const milliseconds = value < 1_000_000_000_000 ? value * 1000 : value;
      const date = new Date(milliseconds);
      return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    }

    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  private hasProviderError(root: RecordValue): boolean {
    const status = root.status ?? root.code;
    if (typeof status === 'number') return status !== 0;
    if (typeof status === 'string' && /^\d+$/.test(status)) {
      return status !== '0';
    }
    return Boolean(root.error);
  }

  private firstNumber(...values: unknown[]): number | undefined {
    for (const value of values) {
      const number = typeof value === 'number' ? value : Number(value);
      if (Number.isFinite(number)) return number;
    }
    return undefined;
  }

  private asRecord(value: unknown): RecordValue | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as RecordValue)
      : undefined;
  }

  private asArray(value: unknown): unknown[] | undefined {
    return Array.isArray(value) ? value : undefined;
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private configValue<T>(key: string): T | undefined {
    return this.configService?.get<T>(key);
  }

  private baseUrl(): string {
    const configured =
      this.configValue<string>('TENCENT_LBS_BASE_URL') ??
      DEFAULT_BASE_URL;
    return configured.replace(/\/+$/, '');
  }

  private timeoutMs(): number {
    const configured = Number(
      this.configValue<string | number>('TENCENT_LBS_TIMEOUT_MS'),
    );
    return Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_TIMEOUT_MS;
  }

  private unavailable(reason: string): OutfitTemperatureContext {
    return {
      status: 'unavailable',
      hourly: [],
      reason,
    };
  }
}

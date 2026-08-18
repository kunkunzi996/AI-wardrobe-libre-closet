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

/**
 * 天气接口只接受经纬度或行政区划码二选一——**不存在 `city` 参数**。
 * 用户手动填写的城市名必须先经地址解析换成 adcode 才能查询。
 */
type WeatherQuery =
  | { kind: 'location'; value: string }
  | { kind: 'adcode'; value: string };

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

    // 手动城市先经地址解析换成 adcode；解析不出来就如实降级，
    // 不猜测、不退回默认城市（HC-06）。
    const query = await this.resolveQuery(request, apiKey);
    if (!query) {
      return this.unavailable('天气位置不可用。');
    }

    // 腾讯天气接口无法在一次请求里同时返回实时与逐小时（实测 type=now,hours
    // 只返回 realtime），必须分两次取。每秒配额上限极低，全部请求严格串行。
    const realtimePayload = await this.fetchPayload(
      this.requestUrl(query, apiKey, 'now'),
    );
    if (!realtimePayload) {
      return this.unavailable('天气服务暂时不可用。');
    }

    const hoursPayload = await this.fetchPayload(
      this.requestUrl(query, apiKey, 'hours'),
    );
    if (!hoursPayload) {
      return this.unavailable('天气服务暂时不可用。');
    }

    const context = this.parseProviderPayload(
      realtimePayload,
      hoursPayload,
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
  }

  /**
   * 把归一化请求变成天气接口真正接受的查询条件。
   * auto 直接用降精度后的经纬度；manual 必须多打一次地址解析换取 adcode。
   */
  private async resolveQuery(
    request: NormalizedWeatherRequest,
    apiKey: string,
  ): Promise<WeatherQuery | undefined> {
    if (request.mode === 'auto') {
      return {
        kind: 'location',
        value: `${request.latitude.toFixed(2)},${request.longitude.toFixed(2)}`,
      };
    }

    const adcode = await this.resolveAdcode(request.city, apiKey);
    return adcode ? { kind: 'adcode', value: adcode } : undefined;
  }

  /** 地址解析：城市名 → 行政区划码。拿不到就返回 undefined，绝不猜测。 */
  private async resolveAdcode(
    city: string,
    apiKey: string,
  ): Promise<string | undefined> {
    const url = new URL('/ws/geocoder/v1/', this.baseUrl());
    url.searchParams.set('key', apiKey);
    url.searchParams.set('output', 'json');
    url.searchParams.set('address', city);

    const payload = await this.fetchPayload(url.toString());
    const result = this.asRecord(this.asRecord(payload)?.result);
    const adInfo = this.asRecord(result?.ad_info);
    return this.asString(adInfo?.adcode);
  }

  /** 单次供应商请求：自带超时与中断，失败一律返回 undefined，不向上抛。 */
  private async fetchPayload(url: string): Promise<unknown> {
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
        this.fetchImpl(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        }),
        timeoutPromise,
      ]);

      if (!response?.ok) {
        return undefined;
      }

      const payload = await response.json();
      const root = this.asRecord(payload);
      return root && !this.hasProviderError(root) ? root : undefined;
    } catch {
      return undefined;
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
    query: WeatherQuery,
    apiKey: string,
    type: 'now' | 'hours',
  ): string {
    const url = new URL('/ws/weather/v1/', this.baseUrl());
    url.searchParams.set('key', apiKey);
    url.searchParams.set('output', 'json');
    // type 必须显式传：缺省只返回实时，且腾讯对不认识的取值静默退回实时而不报错。
    url.searchParams.set('type', type);
    url.searchParams.set(query.kind, query.value);
    return url.toString();
  }

  /**
   * 按腾讯实测契约解析两份响应，字段路径见 docs/plan.md#外部依赖实测契约。
   * 这里刻意不做「猜多个候选字段名」的兜底：契约由 __fixtures__ 下的实测样本
   * 固定，对不上就应当暴露成不可用并回到 P3，而不是靠猜蒙混过去。
   */
  private parseProviderPayload(
    realtimePayload: unknown,
    hoursPayload: unknown,
    fallbackCity?: string,
  ): OutfitTemperatureContext | undefined {
    // 实时：result.realtime 是数组，每个元素的 infos 是对象
    const realtimeResult = this.asRecord(
      this.asRecord(realtimePayload)?.result,
    );
    const realtimeEntry = this.asRecord(
      this.asArray(realtimeResult?.realtime)?.[0],
    );
    const currentC = this.firstNumber(
      this.asRecord(realtimeEntry?.infos)?.temperature,
    );
    if (currentC === undefined) {
      return undefined;
    }

    // 逐小时：result.forecast_hours 是数组，元素的 infos 也是数组
    const hoursResult = this.asRecord(this.asRecord(hoursPayload)?.result);
    const hoursEntry = this.asRecord(
      this.asArray(hoursResult?.forecast_hours)?.[0],
    );
    const rawHourly = this.asArray(hoursEntry?.infos);
    if (!rawHourly) {
      return undefined;
    }

    const hourly = this.normalizeHourly(rawHourly);
    if (hourly.length < 8) {
      return undefined;
    }

    // 按 adcode 查询时 city/district 可能为空串，逐级回退到省级
    const city =
      this.asString(realtimeEntry?.city) ??
      this.asString(realtimeEntry?.district) ??
      this.asString(realtimeEntry?.province) ??
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
          this.asRecord(point.info)?.temperature,
        );
        if (temperatureC === undefined) return undefined;

        const timestamp = this.normalizeTimestamp(point.hour);
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

  /**
   * 腾讯的 hour 形如 "2026-08-17 10:00:00"：没有时区标记，但恒为东八区。
   *
   * 直接交给 `new Date(...)` 会按**运行环境时区**解释——开发机是东八区，
   * 结果碰巧正确；生产容器（docker/Dockerfile 的 node:22-slim，未设 TZ）
   * 是 UTC，整条时间轴会偏移 8 小时，用户看到的时段标签全错。
   * 因此这里显式补 `+08:00`，让解析结果与运行环境无关。
   */
  private normalizeTimestamp(value: unknown): string | undefined {
    const raw = this.asString(value);
    if (!raw) {
      return undefined;
    }

    const matched = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/.exec(raw);
    if (!matched) {
      return undefined;
    }

    const date = new Date(
      `${matched[1]}T${matched[2]}${matched[3] ?? ':00'}+08:00`,
    );
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
      this.configValue<string>('TENCENT_LBS_BASE_URL') ?? DEFAULT_BASE_URL;
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

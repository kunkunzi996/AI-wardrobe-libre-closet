import { TencentWeatherService } from './tencent-weather.service';

type FetchResult = {
  ok: boolean;
  json: () => Promise<unknown>;
};

describe('TencentWeatherService', () => {
  const secretKey = 'test-tencent-key';

  const makeConfig = (overrides: Record<string, unknown> = {}) => ({
    get: jest.fn((key: string) => {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        return overrides[key];
      }

      if (key === 'TENCENT_LBS_KEY') return secretKey;
      if (key === 'TENCENT_LBS_BASE_URL') {
        return 'https://weather.example.test';
      }
      if (key === 'TENCENT_LBS_TIMEOUT_MS') return 50;
      return undefined;
    }),
  });

  const response = (payload: unknown, ok = true): FetchResult => ({
    ok,
    json: async () => payload,
  });

  const futureHours = [18, 19, 20, 21, 23, 24, 25, 26, 24, 22].map(
    (temperature, index) => {
      const time = new Date(
        Date.now() + (index - 2) * 60 * 60 * 1000,
      ).toISOString();
      return {
        time,
        timestamp: time,
        temperature,
        temperatureC: temperature,
      };
    },
  );

  const successfulProviderPayload = {
    status: 0,
    message: 'query ok',
    result: {
      city: '上海市',
      adcode: '310100',
      address_component: {
        city: '上海市',
        adcode: '310100',
      },
      location: {
        lat: 31.23,
        lng: 121.47,
      },
      realtime: {
        time: new Date().toISOString(),
        temperature: 22,
        temperatureC: 22,
      },
      hourly: futureHours,
      forecast: {
        hourly: futureHours,
      },
    },
  };

  const makeFetch = (
    payload: unknown = successfulProviderPayload,
  ): jest.Mock<Promise<FetchResult>, [string, RequestInit?]> =>
    jest.fn(async () => response(payload));

  it('在外发和缓存前将自动坐标保留两位，并归一化当前及未来八小时温度', async () => {
    const fetchImpl = makeFetch();
    const service = new TencentWeatherService(
      makeConfig() as any,
      fetchImpl as any,
    );

    const result = await service.getContext({
      mode: 'auto',
      latitude: 31.230456,
      longitude: 121.473789,
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'available',
        city: '上海市',
        currentC: 22,
        minC: 20,
        maxC: 26,
      }),
    );
    expect(result.hourly).toHaveLength(8);
    expect(result.hourly.map((point: any) => point.temperatureC)).toEqual([
      20, 21, 23, 24, 25, 26, 24, 22,
    ]);

    const requestedUrls = fetchImpl.mock.calls.map(([url]) => String(url));
    expect(requestedUrls.some((url) => url.includes('31.23'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('121.47'))).toBe(true);
    expect(requestedUrls.join('\n')).not.toContain('31.230456');
    expect(requestedUrls.join('\n')).not.toContain('121.473789');
    expect(JSON.stringify(result)).not.toContain(secretKey);
    expect(JSON.stringify(result)).not.toContain('31.230456');
    expect(JSON.stringify(result)).not.toContain('121.473789');
  });

  it('手动城市请求不需要暴露坐标，并返回供应商归一化城市', async () => {
    const fetchImpl = makeFetch();
    const service = new TencentWeatherService(
      makeConfig() as any,
      fetchImpl as any,
    );

    const result = await service.getContext({
      mode: 'manual',
      city: ' 上海 ',
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'available',
        city: '上海市',
      }),
    );
    expect(fetchImpl).toHaveBeenCalled();
    expect(
      fetchImpl.mock.calls.some(([url]) =>
        decodeURIComponent(String(url)).includes('上海'),
      ),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toContain(secretKey);
  });

  it('相同的降精度坐标在十五分钟缓存窗口内只请求一次', async () => {
    const fetchImpl = makeFetch();
    const service = new TencentWeatherService(
      makeConfig() as any,
      fetchImpl as any,
    );

    const first = await service.getContext({
      mode: 'auto',
      latitude: 31.23041,
      longitude: 121.47371,
    });
    const second = await service.getContext({
      mode: 'auto',
      latitude: 31.23049,
      longitude: 121.47379,
    });

    expect(first).toEqual(second);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('缺少 Key 时返回 unavailable，不发起供应商请求且不抛错', async () => {
    const fetchImpl = makeFetch();
    const service = new TencentWeatherService(
      makeConfig({
        TENCENT_LBS_KEY: undefined,
      }) as any,
      fetchImpl as any,
    );

    await expect(
      service.getContext({ mode: 'manual', city: '上海' }),
    ).resolves.toEqual(expect.objectContaining({ status: 'unavailable' }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('只读取 canonical 腾讯配置，旧天气别名不会生效', async () => {
    const fetchImpl = makeFetch();
    const service = new TencentWeatherService(
      makeConfig({
        TENCENT_LBS_KEY: undefined,
        TENCENT_WEATHER_API_KEY: 'legacy-key',
        TENCENT_WEATHER_BASE_URL: 'https://legacy.example.test',
        TENCENT_WEATHER_TIMEOUT_MS: 1,
      }) as any,
      fetchImpl as any,
    );

    await expect(
      service.getContext({ mode: 'manual', city: '上海' }),
    ).resolves.toEqual(expect.objectContaining({ status: 'unavailable' }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('供应商超时或抛出网络错误时返回 unavailable，不阻断推荐', async () => {
    const fetchImpl = jest.fn<Promise<FetchResult>, [string, RequestInit?]>(
      async () => {
        const error = new Error('request timed out');
        error.name = 'AbortError';
        throw error;
      },
    );
    const service = new TencentWeatherService(
      makeConfig() as any,
      fetchImpl as any,
    );

    await expect(
      service.getContext({ mode: 'manual', city: '上海' }),
    ).resolves.toEqual(expect.objectContaining({ status: 'unavailable' }));
  });

  it('供应商返回错误状态或不足八个未来小时数据时返回 unavailable', async () => {
    const providerErrorFetch = makeFetch({
      status: 110,
      message: 'invalid key',
      result: null,
    });
    const providerErrorService = new TencentWeatherService(
      makeConfig() as any,
      providerErrorFetch as any,
    );

    await expect(
      providerErrorService.getContext({ mode: 'manual', city: '上海' }),
    ).resolves.toEqual(expect.objectContaining({ status: 'unavailable' }));

    const insufficientPayload = {
      ...successfulProviderPayload,
      result: {
        ...successfulProviderPayload.result,
        hourly: futureHours.slice(2, 7),
        forecast: { hourly: futureHours.slice(2, 7) },
      },
    };
    const insufficientService = new TencentWeatherService(
      makeConfig() as any,
      makeFetch(insufficientPayload) as any,
    );

    await expect(
      insufficientService.getContext({ mode: 'manual', city: '上海' }),
    ).resolves.toEqual(expect.objectContaining({ status: 'unavailable' }));
  });
});

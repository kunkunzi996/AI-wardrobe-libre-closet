import {
  TENCENT_FORECAST_HOURS,
  TENCENT_GEOCODER_BEIJING,
  TENCENT_GEOCODER_NOT_FOUND,
  TENCENT_REALTIME_BY_ADCODE,
  TENCENT_REALTIME_BY_LOCATION,
} from './__fixtures__/tencent-weather-responses';
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
    json: () => Promise.resolve(payload),
  });

  // 默认 payload 用实测夹具。此处曾放置两个「按想象编造」的响应构造器：它们把
  // 实时数据写成对象、把逐小时挂在 result.hourly，与腾讯真实契约完全不符
  // （BUG-13）。留着的后果是消费它们的用例在解析第一步就短路，看似绿灯实则一条
  // 守卫都没测到（BUG-16，两个构造器的原名见 docs/plan.md 缺陷表）。
  // 因此本文件只允许出现实测原文，不再有任何手写的供应商响应。
  const makeFetch = (
    payload: unknown = TENCENT_REALTIME_BY_LOCATION,
  ): jest.Mock<Promise<FetchResult>, [string, RequestInit?]> =>
    jest.fn(() => Promise.resolve(response(payload)));

  // 真实夹具的时间是固定的历史时刻。不冻结当前时间，「只保留未来时段」的
  // 过滤会随真实时间推移逐条丢弃夹具数据，测试次日即失效。
  const FIXTURE_NOW = Date.parse('2026-08-17T02:00:00.000Z');
  const freezeFixtureNow = () =>
    jest.spyOn(Date, 'now').mockReturnValue(FIXTURE_NOW);

  // 按 URL 分发实测夹具。两点原因：腾讯无法一次返回实时与逐小时，服务会串行
  // 请求两次；手动城市还会先打一次地址解析换取 adcode，桩必须认得这条路径，
  // 否则会把天气夹具喂给 geocoder，造成「实现正确却测试失败」的假象。
  const makeRealFetch = (): jest.Mock<
    Promise<FetchResult>,
    [string, RequestInit?]
  > =>
    jest.fn((url: string) => {
      const target = String(url);
      if (target.includes('/ws/geocoder/v1/')) {
        return Promise.resolve(response(TENCENT_GEOCODER_BEIJING));
      }
      return Promise.resolve(
        response(
          target.includes('type=hours')
            ? TENCENT_FORECAST_HOURS
            : TENCENT_REALTIME_BY_LOCATION,
        ),
      );
    });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('在外发和缓存前将自动坐标保留两位，并归一化当前及未来八小时温度', async () => {
    freezeFixtureNow();
    const fetchImpl = makeRealFetch();
    const service = new TencentWeatherService(
      makeConfig() as any,
      fetchImpl as any,
    );

    const result = await service.getContext({
      mode: 'auto',
      latitude: 39.905023,
      longitude: 116.724502,
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'available',
        city: '北京市',
        currentC: 29,
        minC: 27,
        maxC: 31,
      }),
    );
    expect(result.hourly).toHaveLength(8);
    expect(result.hourly.map((point: any) => point.temperatureC)).toEqual([
      27, 28, 29, 30, 31, 31, 30, 30,
    ]);

    // 隐私保护（SPEC 隐私约束 1）：原始精确坐标不得进入请求，也不得出现在返回中
    const requestedUrls = fetchImpl.mock.calls.map(([url]) => String(url));
    expect(requestedUrls.some((url) => url.includes('39.91'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('116.72'))).toBe(true);
    expect(requestedUrls.join('\n')).not.toContain('39.905023');
    expect(requestedUrls.join('\n')).not.toContain('116.724502');
    expect(JSON.stringify(result)).not.toContain(secretKey);
    expect(JSON.stringify(result)).not.toContain('39.905023');
    expect(JSON.stringify(result)).not.toContain('116.724502');
  });

  it('手动城市请求不需要暴露坐标，并返回供应商归一化城市', async () => {
    freezeFixtureNow();
    const fetchImpl = makeRealFetch();
    const service = new TencentWeatherService(
      makeConfig() as any,
      fetchImpl as any,
    );

    const result = await service.getContext({
      mode: 'manual',
      city: ' 上海 ',
    });

    // 故意让用户输入（上海）与夹具的供应商返回（北京市）不一致：
    // 城市名必须取自供应商，而不是把用户输入原样回显。
    expect(result).toEqual(
      expect.objectContaining({
        status: 'available',
        city: '北京市',
      }),
    );
    expect(fetchImpl).toHaveBeenCalled();
    expect(
      fetchImpl.mock.calls.some(([url]) =>
        decodeURIComponent(String(url)).includes('上海'),
      ),
    ).toBe(true);
    // 手动模式不得携带任何坐标
    expect(
      fetchImpl.mock.calls.map(([url]) => String(url)).join('\n'),
    ).not.toContain('location=');
    expect(JSON.stringify(result)).not.toContain(secretKey);
  });

  it('相同的降精度坐标在十五分钟缓存窗口内只请求一次', async () => {
    freezeFixtureNow();
    const fetchImpl = makeRealFetch();
    const service = new TencentWeatherService(
      makeConfig() as any,
      fetchImpl as any,
    );

    const first = await service.getContext({
      mode: 'auto',
      latitude: 39.90501,
      longitude: 116.72449,
    });
    const second = await service.getContext({
      mode: 'auto',
      latitude: 39.90509,
      longitude: 116.72451,
    });

    expect(first).toEqual(second);
    // 一次取数 = 实时 + 逐小时两次请求；第二次调用必须完全命中缓存，
    // 不得再打供应商（每秒配额上限极低）。
    expect(fetchImpl).toHaveBeenCalledTimes(2);
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
      () => {
        const error = new Error('request timed out');
        error.name = 'AbortError';
        return Promise.reject(error);
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

  // TEST-012 / TEST-013：两条降级守卫的鉴别力保护。
  //
  // 这两条取代了原先一条同时声称守卫「供应商错误状态」与「不足八小时」的用例。
  // 那条用例喂的是编造的返回体，解析层在读 result.realtime[0] 时就短路，两条
  // 守卫**一条都没被执行到**——删掉任意一条守卫它照样绿（BUG-16）。
  //
  // 拆成两条后，每条各自指向一条守卫，并且都通过了变异验证：把对应守卫从
  // 实现中移除，对应用例必须转红。证据见 docs/test.md#TEST-012 / #TEST-013。
  // 两条都必须在 TZ=UTC 下运行，理由同 TEST-010。

  it('供应商返回非零状态码时返回 unavailable', async () => {
    freezeFixtureNow();

    // 由实测响应派生：字段名与层级全部保留，只把顶层 status 由 0 改为 110
    // （腾讯实测的配额超限码）。key 配额是按 key 计的，故两条天气路径同时被拒
    // 才是真实故障形态；只改其中一条会让本用例的红灯依赖「另一条恰好可解析」
    // 这种巧合。派生构造就地声明，不写回夹具文件。
    const quotaExceeded = (payload: { status: number }) => ({
      ...payload,
      status: 110,
      message: '配额超限',
    });

    const fetchImpl = jest.fn((url: string) =>
      Promise.resolve(
        response(
          String(url).includes('type=hours')
            ? quotaExceeded(TENCENT_FORECAST_HOURS)
            : quotaExceeded(TENCENT_REALTIME_BY_LOCATION),
        ),
      ),
    );

    const service = new TencentWeatherService(
      makeConfig() as any,
      fetchImpl as any,
    );

    const result = await service.getContext({
      mode: 'auto',
      latitude: 39.9052,
      longitude: 116.7245,
    });

    expect(result.status).toBe('unavailable');
    // 降级不得携带半截数据
    expect(result.hourly).toEqual([]);
  });

  it('逐小时数据不足八条时返回 unavailable', async () => {
    freezeFixtureNow();

    // 实时必须成功，否则走不到「不足八小时」那道门槛。
    // 逐小时由实测响应派生：字段名与层级全部保留，只把 infos 截到前 5 条。
    const truncatedHours = {
      ...TENCENT_FORECAST_HOURS,
      result: {
        ...TENCENT_FORECAST_HOURS.result,
        forecast_hours: [
          {
            ...TENCENT_FORECAST_HOURS.result.forecast_hours[0],
            infos: TENCENT_FORECAST_HOURS.result.forecast_hours[0].infos.slice(
              0,
              5,
            ),
          },
        ],
      },
    };

    const fetchImpl = jest.fn((url: string) =>
      Promise.resolve(
        response(
          String(url).includes('type=hours')
            ? truncatedHours
            : TENCENT_REALTIME_BY_LOCATION,
        ),
      ),
    );

    const service = new TencentWeatherService(
      makeConfig() as any,
      fetchImpl as any,
    );

    const result = await service.getContext({
      mode: 'auto',
      latitude: 39.9052,
      longitude: 116.7245,
    });

    // 关键断言：不足八条必须整体降级，不得返回 5 条半截趋势
    expect(result.status).toBe('unavailable');
    expect(result.hourly).toEqual([]);
  });

  // TEST-010：以腾讯真实响应夹具为准，锁定 BUG-13（字段路径与 type 参数）
  // 与 BUG-15（无时区时间戳）。必须在 TZ=UTC 下运行，理由见 docs/test.md#TEST-010。
  describe('对齐腾讯真实响应契约', () => {
    // 夹具首个时段为北京时间 2026-08-17 10:00:00，冻结在同一时刻，
    // 让「只保留未来时段」的过滤不随真实时间漂移。
    const FIXTURE_NOW = Date.parse('2026-08-17T02:00:00.000Z');

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('builds an available context from the real Tencent weather responses', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(FIXTURE_NOW);

      const requestedUrls: string[] = [];
      let inFlight = 0;
      let sawConcurrentRequest = false;
      const fetchImpl = jest.fn(async (url: string) => {
        requestedUrls.push(String(url));
        inFlight += 1;
        if (inFlight > 1) sawConcurrentRequest = true;
        await Promise.resolve();
        inFlight -= 1;
        return response(
          String(url).includes('type=hours')
            ? TENCENT_FORECAST_HOURS
            : TENCENT_REALTIME_BY_LOCATION,
        );
      });

      const service = new TencentWeatherService(
        makeConfig() as any,
        fetchImpl as any,
      );

      const result = await service.getContext({
        mode: 'auto',
        latitude: 39.905023,
        longitude: 116.724502,
      });

      // 实时：真实路径为 result.realtime[0].infos.temperature
      expect(result.status).toBe('available');
      expect(result.currentC).toBe(29);
      expect(result.city).toBe('北京市');

      // 逐小时：必须显式请求 type=hours，真实路径为
      // result.forecast_hours[0].infos[].info.temperature
      expect(requestedUrls.some((url) => url.includes('type=hours'))).toBe(
        true,
      );
      expect(result.hourly).toHaveLength(8);
      expect(result.hourly.map((point) => point.temperatureC)).toEqual([
        27, 28, 29, 30, 31, 31, 30, 30,
      ]);
      expect(result.minC).toBe(27);
      expect(result.maxC).toBe(31);

      // BUG-15：夹具中 hour 为 "2026-08-17 10:00:00"，无时区标记但实为东八区。
      // 该断言在 TZ=UTC 下才有鉴别力——按运行环境时区解析会得到 10:00:00.000Z。
      expect(result.hourly[0].timestamp).toBe('2026-08-17T02:00:00.000Z');

      // BUG-14：腾讯天气接口不接受 city 参数
      expect(requestedUrls.join('\n')).not.toContain('city=');

      // 配额：每秒请求上限极低，多次取数必须串行
      expect(sawConcurrentRequest).toBe(false);
    });
  });

  // TEST-011：锁定 BUG-14——腾讯天气接口不接受 city 参数，手动城市必须先经
  // 地址解析换取 adcode。详见 docs/test.md#TEST-011。
  describe('手动城市经地址解析换取 adcode', () => {
    const FIXTURE_NOW_MANUAL = Date.parse('2026-08-17T02:00:00.000Z');

    /** 按 URL 路径分发夹具，并记录调用顺序与并发情况。 */
    const makeRoutedFetch = (
      geocoderPayload: unknown = TENCENT_GEOCODER_BEIJING,
    ) => {
      const requestedUrls: string[] = [];
      const state = { sawConcurrentRequest: false };
      let inFlight = 0;
      const fetchImpl = jest.fn(async (url: string) => {
        const target = String(url);
        requestedUrls.push(target);
        inFlight += 1;
        if (inFlight > 1) state.sawConcurrentRequest = true;
        await Promise.resolve();
        inFlight -= 1;

        if (target.includes('/ws/geocoder/v1/')) {
          return response(geocoderPayload);
        }
        return response(
          target.includes('type=hours')
            ? TENCENT_FORECAST_HOURS
            : TENCENT_REALTIME_BY_ADCODE,
        );
      });
      return { fetchImpl, requestedUrls, state };
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('resolves a manual city to an adcode through the geocoder', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(FIXTURE_NOW_MANUAL);
      const { fetchImpl, requestedUrls, state } = makeRoutedFetch();

      const service = new TencentWeatherService(
        makeConfig() as any,
        fetchImpl as any,
      );

      const result = await service.getContext({
        mode: 'manual',
        city: '北京市',
      });

      // 第一次请求必须是地址解析，且携带用户输入的城市名
      expect(requestedUrls[0]).toContain('/ws/geocoder/v1/');
      expect(decodeURIComponent(requestedUrls[0])).toContain('address=北京市');

      // 之后的天气请求必须使用解析出来的 adcode
      const weatherUrls = requestedUrls.filter((url) =>
        url.includes('/ws/weather/v1/'),
      );
      expect(weatherUrls.length).toBeGreaterThan(0);
      expect(weatherUrls.every((url) => url.includes('adcode=110000'))).toBe(
        true,
      );

      // BUG-14：city 参数腾讯不接受，任何请求都不得再出现
      expect(requestedUrls.join('\n')).not.toContain('city=');

      expect(result.status).toBe('available');
      expect(result.city).toBe('北京市');
      expect(result.hourly).toHaveLength(8);

      // 三次请求（地址解析 + 实时 + 逐小时）必须串行
      expect(state.sawConcurrentRequest).toBe(false);
    });

    it('falls back to unavailable when the geocoder cannot resolve the city', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(FIXTURE_NOW_MANUAL);
      const { fetchImpl, requestedUrls } = makeRoutedFetch(
        TENCENT_GEOCODER_NOT_FOUND,
      );

      const service = new TencentWeatherService(
        makeConfig() as any,
        fetchImpl as any,
      );

      const result = await service.getContext({
        mode: 'manual',
        city: '不存在的地方xyz',
      });

      expect(result.status).toBe('unavailable');
      // HC-06：不得静默猜测城市或退回默认城市，因此不得发出任何天气请求
      expect(requestedUrls.some((url) => url.includes('/ws/weather/v1/'))).toBe(
        false,
      );
    });

    it('falls back to unavailable when the geocoder response carries no adcode', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(FIXTURE_NOW_MANUAL);
      // 由实测成功响应派生：保留 status:0 但摘掉 ad_info，
      // 用于验证「供应商返回成功但缺字段」时的防御，而不是伪造一份实测样本。
      const withoutAdcode = {
        ...TENCENT_GEOCODER_BEIJING,
        result: { ...TENCENT_GEOCODER_BEIJING.result, ad_info: undefined },
      };
      const { fetchImpl, requestedUrls } = makeRoutedFetch(withoutAdcode);

      const service = new TencentWeatherService(
        makeConfig() as any,
        fetchImpl as any,
      );

      const result = await service.getContext({
        mode: 'manual',
        city: '北京市',
      });

      expect(result.status).toBe('unavailable');
      expect(requestedUrls.some((url) => url.includes('/ws/weather/v1/'))).toBe(
        false,
      );
    });
  });
});

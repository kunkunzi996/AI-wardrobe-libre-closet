/**
 * 腾讯位置服务真实响应夹具。
 *
 * 来源：2026-08-17 用真实开发密钥对 https://apis.map.qq.com 的实际调用结果。
 * 入库时只删除了 request_id，其余字段名、层级与取值均为供应商原文。
 *
 * 契约摘要见 docs/plan.md#外部依赖实测契约。
 *
 * 【禁止手写或改写本文件的任何字段名与层级】
 * 这些夹具是外部契约的事实记录，不是可调参数。解析代码与夹具对不上时，
 * 要改的是解析代码。本轮 BUG-13~BUG-15 的根因正是：原实现按想象中的契约
 * 编写，而测试又按同一份想象编造返回体，于是全绿却全错。
 */

/** GET /ws/weather/v1/?type=now&location=39.91,116.72 —— 实时天气（按经纬度） */
export const TENCENT_REALTIME_BY_LOCATION = {
  status: 0,
  message: 'Success',
  result: {
    realtime: [
      {
        province: '北京市',
        city: '北京市',
        district: '通州区',
        adcode: 110112,
        update_time: '2026-08-17 11:05',
        infos: {
          weather: '多云',
          temperature: 29,
          wind_direction: '北风',
          wind_power: '2-3级',
          wind_power_v2: '2级',
          humidity: 60,
          air_pressure: 1005,
        },
      },
    ],
  },
} as const;

/** GET /ws/weather/v1/?type=now&adcode=110000 —— 实时天气（按行政区划码） */
export const TENCENT_REALTIME_BY_ADCODE = {
  status: 0,
  message: 'Success',
  result: {
    realtime: [
      {
        province: '北京市',
        city: '',
        district: '',
        adcode: 110000,
        update_time: '2026-08-17 11:05',
        infos: {
          weather: '多云',
          temperature: 28,
          wind_direction: '北风',
          wind_power: '2-3级',
          wind_power_v2: '2级',
          humidity: 55,
          air_pressure: 1004,
        },
      },
    ],
  },
} as const;

/** GET /ws/weather/v1/?type=hours&adcode=110000 —— 未来 24 小时逐小时预报 */
export const TENCENT_FORECAST_HOURS = {
  status: 0,
  message: 'Success',
  result: {
    forecast_hours: [
      {
        province: '北京市',
        city: '',
        district: '',
        adcode: 110000,
        update_time: '2026-08-17 11:05',
        infos: [
          {
            hour: '2026-08-17 10:00:00',
            info: {
              weather: '晴天',
              temperature: 27,
              wind_direction: '北风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-17 11:00:00',
            info: {
              weather: '晴天',
              temperature: 28,
              wind_direction: '北风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-17 12:00:00',
            info: {
              weather: '晴天',
              temperature: 29,
              wind_direction: '东北风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-17 13:00:00',
            info: {
              weather: '晴天',
              temperature: 30,
              wind_direction: '东风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-17 14:00:00',
            info: {
              weather: '晴天',
              temperature: 31,
              wind_direction: '南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-17 15:00:00',
            info: {
              weather: '晴天',
              temperature: 31,
              wind_direction: '东南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-17 16:00:00',
            info: {
              weather: '晴天',
              temperature: 30,
              wind_direction: '东南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-17 17:00:00',
            info: {
              weather: '晴天',
              temperature: 30,
              wind_direction: '南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-17 18:00:00',
            info: {
              weather: '晴天',
              temperature: 29,
              wind_direction: '东南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-17 19:00:00',
            info: {
              weather: '晴天',
              temperature: 28,
              wind_direction: '南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-17 20:00:00',
            info: {
              weather: '晴天',
              temperature: 27,
              wind_direction: '南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-17 21:00:00',
            info: {
              weather: '多云',
              temperature: 27,
              wind_direction: '南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-17 22:00:00',
            info: {
              weather: '多云',
              temperature: 26,
              wind_direction: '南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-17 23:00:00',
            info: {
              weather: '多云',
              temperature: 26,
              wind_direction: '南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-18 00:00:00',
            info: {
              weather: '多云',
              temperature: 25,
              wind_direction: '南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-18 01:00:00',
            info: {
              weather: '多云',
              temperature: 25,
              wind_direction: '南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-18 02:00:00',
            info: {
              weather: '多云',
              temperature: 24,
              wind_direction: '南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-18 03:00:00',
            info: {
              weather: '多云',
              temperature: 24,
              wind_direction: '南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-18 04:00:00',
            info: {
              weather: '多云',
              temperature: 24,
              wind_direction: '南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-18 05:00:00',
            info: {
              weather: '多云',
              temperature: 23,
              wind_direction: '西南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-18 06:00:00',
            info: {
              weather: '多云',
              temperature: 24,
              wind_direction: '西南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-18 07:00:00',
            info: {
              weather: '多云',
              temperature: 25,
              wind_direction: '西南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-18 08:00:00',
            info: {
              weather: '多云',
              temperature: 26,
              wind_direction: '西南风',
              wind_power: '微风',
            },
          },
          {
            hour: '2026-08-18 09:00:00',
            info: {
              weather: '多云',
              temperature: 27,
              wind_direction: '西南风',
              wind_power: '微风',
            },
          },
        ],
      },
    ],
  },
} as const;

/** GET /ws/weather/v1/?type=future&adcode=110000 —— 未来 4 天预报（本轮未消费，仅作契约留档） */
export const TENCENT_FORECAST_DAYS = {
  status: 0,
  message: 'Success',
  result: {
    forecast: [
      {
        province: '北京市',
        city: '',
        district: '',
        adcode: 110000,
        update_time: '2026-08-17 11:05',
        infos: [
          {
            date: '2026-08-17',
            week: '星期一',
            day: {
              weather: '晴天',
              temperature: 31,
              wind_direction: '北风',
              wind_power: '微风',
              humidity: 78,
            },
            night: {
              weather: '多云',
              temperature: 23,
              wind_direction: '东南风',
              wind_power: '微风',
              humidity: 37,
            },
          },
          {
            date: '2026-08-18',
            week: '星期二',
            day: {
              weather: '雷阵雨',
              temperature: 31,
              wind_direction: '南风',
              wind_power: '微风',
              humidity: 87,
            },
            night: {
              weather: '多云',
              temperature: 23,
              wind_direction: '东北风',
              wind_power: '微风',
              humidity: 49,
            },
          },
          {
            date: '2026-08-19',
            week: '星期三',
            day: {
              weather: '多云',
              temperature: 32,
              wind_direction: '南风',
              wind_power: '微风',
              humidity: 88,
            },
            night: {
              weather: '多云',
              temperature: 23,
              wind_direction: '东南风',
              wind_power: '微风',
              humidity: 52,
            },
          },
          {
            date: '2026-08-20',
            week: '星期四',
            day: {
              weather: '多云',
              temperature: 32,
              wind_direction: '南风',
              wind_power: '微风',
              humidity: 90,
            },
            night: {
              weather: '多云',
              temperature: 23,
              wind_direction: '东北风',
              wind_power: '微风',
              humidity: 56,
            },
          },
        ],
      },
    ],
  },
} as const;

/** GET /ws/geocoder/v1/?address=北京市 —— 地址解析成功，adcode 取自 result.ad_info.adcode */
export const TENCENT_GEOCODER_BEIJING = {
  status: 0,
  message: 'Success',
  result: {
    title: '北京市',
    location: {
      lng: 116.724502,
      lat: 39.905023,
    },
    ad_info: {
      adcode: '110000',
    },
    address_components: {
      province: '北京市',
      city: '北京市',
      district: '',
      street: '',
      street_number: '',
    },
    similarity: 0.99,
    deviation: 1000,
    reliability: 7,
    level: 1,
  },
} as const;

/**
 * GET /ws/geocoder/v1/?address=不存在的地方xyz —— 地址解析失败。
 * 注意：腾讯此时返回的是 status:348，而不是 status:0 配空结果。
 */
export const TENCENT_GEOCODER_NOT_FOUND = {
  status: 348,
  message: '参数错误',
} as const;

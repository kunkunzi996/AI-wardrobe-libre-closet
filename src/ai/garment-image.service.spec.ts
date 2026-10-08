import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// 首轮不存在实现时，由公开契约断言报红，不用 import/编译失败冒充红灯。
const loadService = () => {
  const source = path.join(__dirname, 'garment-image.service.ts');
  const Service = fs.existsSync(source)
    ? require('./garment-image.service').GarmentImageService
    : undefined;
  expect(Service).toEqual(expect.any(Function));
  return Service;
};

describe('TEST-016 千问图像公开请求合同', () => {
  const hashes: Record<string, string> = {
    上衣: 'ac234938f7a16732375d7f28f5fd77089203f321e46c57e824852d625920d18f',
    裤子: '0af5ac12660291e480b4c477017bf97d0653866cd3bfedfe161056e854ba95b3',
    半身裙: '1943760f0922ad385507bfcc5411eee857dc9fd2b2667d746b28a73c8b4cb00e',
    连衣裙: '843fc4cb9b3bc87233ca11e1cce8db2a7e03823f4eab7f81e485086f26e9639e',
    外套: '8f065c083714b57d92906a3896a60368529207c40bd0b0f49aef3e0704c7ff72',
  };
  const baseConfig = {
    QWEN_IMAGE_ENABLED: true,
    QWEN_IMAGE_MODEL: 'qwen-image-3.0-pro',
    QWEN_IMAGE_API_URL: 'https://model.invalid/generate',
    QWEN_IMAGE_TIMEOUT_MS: 1000,
    QWEN_API_KEY: 'test-image-key-not-real',
  };
  let input: Buffer;
  const response = (body: unknown, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  const validResult = {
    request_id: 'request-test-016',
    output: {
      choices: [
        {
          message: {
            content: [{ image: 'https://images.invalid/result.png' }],
          },
        },
      ],
    },
    usage: { input_image_count: 1, output_image_count: 1 },
  };
  const makeService = (fetchImpl: jest.Mock, overrides = {}) => {
    const config: Record<string, unknown> = { ...baseConfig, ...overrides };
    return new (loadService())(
      { get: (key: string, fallback?: unknown) => config[key] ?? fallback },
      fetchImpl,
    );
  };
  beforeAll(async () => {
    input = await sharp({
      create: { width: 40, height: 80, channels: 4, background: '#2288aa' },
    })
      .png()
      .toBuffer();
  });

  it.each(Object.keys(hashes))(
    'TEST-016 %s 原样固定文本、一张候选及实验参数',
    async (family) => {
      const fetchImpl = jest.fn(async () => response(validResult));
      const service = makeService(fetchImpl);
      const result = await service.generate(input, family);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      const [url, options] = fetchImpl.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ];
      expect(url).toBe(baseConfig.QWEN_IMAGE_API_URL);
      expect(options.method).toBe('POST');
      expect(options.headers).toEqual(
        expect.objectContaining({
          Authorization: 'Bearer test-image-key-not-real',
        }),
      );
      const request = JSON.parse(String(options.body));
      expect(request.model).toBe('qwen-image-3.0-pro');
      expect(request.parameters).toEqual({
        n: 1,
        size: '1024*1024',
        prompt_extend: false,
        watermark: false,
        seed: 701,
      });
      const content = request.input.messages[0].content;
      expect(content).toHaveLength(2);
      expect(
        createHash('sha256').update(content[1].text, 'utf8').digest('hex'),
      ).toBe(hashes[family]);
      expect(content[0].image).toMatch(/^data:image\/jpeg;base64,/);
      const bytes = Buffer.from(content[0].image.split(',')[1], 'base64');
      expect(await sharp(bytes).metadata()).toMatchObject({
        format: 'jpeg',
        width: 1024,
        height: 1024,
      });
      expect(service.promptVersion).toBe('20261006-v1');
      expect(result).toEqual({
        requestId: 'request-test-016',
        imageUrl: 'https://images.invalid/result.png',
        usage: validResult.usage,
      });
    },
  );

  it.each([
    { QWEN_IMAGE_ENABLED: false },
    { QWEN_API_KEY: '' },
    { QWEN_IMAGE_API_URL: '' },
    { QWEN_IMAGE_MODEL: 'other-model' },
  ])('TEST-016 配置不满足时发送前明确失败，零请求 %j', async (override) => {
    const fetchImpl = jest.fn();
    const service = makeService(fetchImpl, override);
    await expect(service.generate(input, '上衣')).rejects.toMatchObject({
      kind: 'failed',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('TEST-016 供应商确认拒绝与发出后断网区别，均不重试', async () => {
    const refusedFetch = jest.fn(async () =>
      response({ code: 'InvalidParameter', request_id: 'rejected' }, 400),
    );
    await expect(
      makeService(refusedFetch).generate(input, '上衣'),
    ).rejects.toMatchObject({ kind: 'failed' });
    expect(refusedFetch).toHaveBeenCalledTimes(1);
    const disconnected = jest.fn(async () => {
      throw new Error('test network lost');
    });
    await expect(
      makeService(disconnected).generate(input, '上衣'),
    ).rejects.toMatchObject({ kind: 'uncertain' });
    expect(disconnected).toHaveBeenCalledTimes(1);
  });

  it.each([
    {},
    { request_id: 'partial', output: { choices: [] } },
    { ...validResult, usage: { input_image_count: 1, output_image_count: 2 } },
    {
      ...validResult,
      output: {
        choices: [
          { message: { content: [{ image: 'http://127.0.0.1/result' }] } },
        ],
      },
    },
  ])('TEST-016 成功但响应不完整不能虚称已完成或未扣费 %j', async (body) => {
    const fetchImpl = jest.fn(async () => response(body));
    await expect(
      makeService(fetchImpl).generate(input, '上衣'),
    ).rejects.toMatchObject({ kind: 'uncertain' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('TEST-016 未支持 family 和无效输入发送前失败', async () => {
    const fetchImpl = jest.fn();
    const service = makeService(fetchImpl);
    await expect(service.generate(input, '鞋子')).rejects.toMatchObject({
      kind: 'failed',
    });
    await expect(
      service.generate(Buffer.from('not-an-image'), '上衣'),
    ).rejects.toMatchObject({ kind: 'failed' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

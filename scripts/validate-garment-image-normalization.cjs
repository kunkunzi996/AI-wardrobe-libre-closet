const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const base = 'https://aimatchwear.asia';
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const cases = [];
const test = (name, run) => cases.push({ name, run });
const flush = async () => {
  for (let i = 0; i < 15; i++) await Promise.resolve();
};
const garment = {
  id: 7,
  name: '测试上衣',
  category: 'tops',
  photoUrl: base + '/file/current.webp',
  originalPhotoUrl: base + '/api/miniapp/garments/7/photos/original?v=11',
};
const idle = {
  attemptKey: null,
  status: 'idle',
  family: '上衣',
  message: '',
  originalPhotoUrl: garment.originalPhotoUrl,
  candidatePhotoUrl: '',
  adopted: false,
  canStart: true,
  canAdopt: false,
};
const ready = {
  ...idle,
  attemptKey: 'server-attempt',
  status: 'ready',
  canStart: false,
  canAdopt: true,
  candidatePhotoUrl: base + '/api/miniapp/garments/7/photos/candidate?v=12',
};

function loadPage(api, extra = {}) {
  let definition;
  const previews = [];
  const timers = new Map();
  let timerId = 0;
  const context = vm.createContext({
    console,
    Promise,
    Date,
    Math,
    Map,
    wx: { previewImage: (o) => previews.push(o), showToast() {}, ...extra.wx },
    setTimeout: (callback) => {
      timers.set(++timerId, callback);
      return timerId;
    },
    clearTimeout: (id) => timers.delete(id),
    getApp: () => ({ globalData: {} }),
  });
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const requireLocal = (id) => {
      if (id.endsWith('/utils/api')) return api;
      return load(
        path.resolve(
          path.dirname(filename),
          id + (path.extname(id) ? '' : '.js'),
        ),
      );
    };
    const wrapped = vm.runInContext(
      '(function(require,module,exports,Page){' +
        fs.readFileSync(filename, 'utf8') +
        '\n})',
      context,
      { filename },
    );
    wrapped(requireLocal, module, module.exports, (value) => {
      definition = value;
    });
    return module.exports;
  }
  load(
    path.join(root, extra.file || 'miniprogram/pages/garment-detail/index.js'),
  );
  const page = Object.assign({}, definition, {
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(values) {
      for (const [key, value] of Object.entries(values)) {
        const parts = key.split('.');
        let target = this.data;
        for (const part of parts.slice(0, -1)) target = target[part];
        target[parts.at(-1)] = value;
      }
    },
  });
  return { page, previews, timers };
}

function fakeApi() {
  const calls = { start: [], get: [], adopt: [] };
  let view = { ...idle };
  const api = {
    getGarment: async () => ({ item: { ...garment } }),
    getGarmentNormalization: async (id) => {
      calls.get.push(id);
      return { item: { ...view } };
    },
    startGarmentNormalization: async (id, attemptKey) => {
      calls.start.push({ id, attemptKey });
      view = { ...ready, attemptKey };
      return { item: { ...view } };
    },
    adoptGarmentNormalization: async (...args) => {
      calls.adopt.push(args);
      return { item: { ...garment, photoUrl: 'wxfile://adopted.png' } };
    },
    resolvePrivateImageUrls: async (value) => {
      const result = JSON.parse(JSON.stringify(value));
      for (const key of ['originalPhotoUrl', 'candidatePhotoUrl'])
        if (result[key]) result[key] = 'wxfile://' + key + '.png';
      return result;
    },
  };
  return {
    api,
    calls,
    setView: (value) => {
      view = value;
    },
  };
}

test('TEST-017 加载零生成、手动生成一张并只预览、暂不采用不换图', async () => {
  const fake = fakeApi();
  const { page } = loadPage(fake.api);
  page.onLoad({ id: '7' });
  await flush();
  assert.equal(fake.calls.start.length, 0);
  assert.equal(page.data.garment.photoUrl, garment.photoUrl);
  assert.equal(
    typeof page.startImageNormalization,
    'function',
    '缺少手动 AI 整理事件',
  );
  await page.startImageNormalization();
  await flush();
  assert.equal(fake.calls.start.length, 1);
  assert.equal(typeof fake.calls.start[0].attemptKey, 'string');
  assert.ok(fake.calls.start[0].attemptKey.length > 0);
  assert.equal(page.data.normalization.status, 'ready');
  assert.equal(
    page.data.normalization.candidatePhotoUrl,
    'wxfile://candidatePhotoUrl.png',
  );
  assert.equal(page.data.garment.photoUrl, garment.photoUrl);
  assert.equal(page.data.normalization.canAdopt, true);
  assert.equal(fake.calls.adopt.length, 0);
  assert.equal(typeof page.dismissNormalizationPreview, 'function');
  page.dismissNormalizationPreview();
  await flush();
  assert.equal(page.data.normalizationPreviewVisible, false);
  assert.equal(fake.calls.start.length, 1);
  assert.equal(fake.calls.adopt.length, 0);
});

test('TEST-017 不支持或缺原图保留衣物并说明原因，不请求开始', async () => {
  for (const message of ['当前类别不支持整理', '缺少上传原图，不能整理']) {
    const fake = fakeApi();
    fake.setView({ ...idle, canStart: false, family: null, message });
    const { page } = loadPage(fake.api);
    page.onLoad({ id: '7' });
    await flush();
    assert.ok(
      page.data.normalization,
      '详情应读取整理状态而不是隐藏不支持原因',
    );
    assert.equal(page.data.normalization.message, message);
    await page.startImageNormalization();
    await flush();
    assert.equal(fake.calls.start.length, 0);
    assert.equal(page.data.garment.name, garment.name);
  }
});

test('TEST-017 API 只调用受保护业务路由，不含模型 Key 或自由 prompt', async () => {
  const module = { exports: {} };
  const requests = [];
  vm.runInNewContext(read('miniprogram/utils/api.js'), {
    module,
    console,
    Promise,
    require: (id) => require(path.join(root, 'miniprogram/utils', id)),
    wx: {
      getStorageSync: () => 'test-token',
      request: (options) => {
        requests.push(options);
        options.success({ statusCode: 201, data: { item: ready } });
      },
      downloadFile() {},
    },
  });
  const api = module.exports;
  assert.equal(
    typeof api.startGarmentNormalization,
    'function',
    'API 尚未提供手动整理公开入口',
  );
  await api.startGarmentNormalization(7, 'test-017-attempt');
  await api.getGarmentNormalization(7);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, base + '/api/miniapp/garments/7/normalization');
  assert.equal(requests[0].method, 'POST');
  assert.deepEqual(JSON.parse(JSON.stringify(requests[0].data)), {
    attemptKey: 'test-017-attempt',
  });
  assert.equal(requests[0].header.Authorization, 'Bearer test-token');
  assert.equal(requests[1].method, 'GET');
  assert.ok(!read('miniprogram/utils/api.js').includes('qwen-image-3.0-pro'));
});

test('TEST-017 对比使用完整衣物比例并绑定明确开始/关闭事件', async () => {
  const template = read('miniprogram/pages/garment-detail/index.wxml');
  assert.match(template, /bindtap="startImageNormalization"/);
  assert.match(template, /bindtap="dismissNormalizationPreview"/);
  assert.match(template, /normalization\.candidatePhotoUrl/);
  assert.match(template, /mode="aspectFit"/);
});

test('TEST-019 开始响应超时后先查询，同步连点只开始一次', async () => {
  const fake = fakeApi();
  const { page } = loadPage(fake.api);
  page.onLoad({ id: '7' });
  await flush();
  const before = fake.calls.get.length;
  fake.api.startGarmentNormalization = async (id, attemptKey) => {
    fake.calls.start.push({ id, attemptKey });
    fake.setView({ ...idle, status: 'processing', canStart: false });
    throw new Error('开始请求超时');
  };
  await Promise.all([
    page.startImageNormalization(),
    page.startImageNormalization(),
  ]);
  await flush();
  assert.equal(fake.calls.start.length, 1);
  assert.ok(fake.calls.get.length > before, '超时后没有查询原次结果');
  assert.equal(page.data.normalization.status, 'processing');
  assert.equal(page.data.garment.photoUrl, garment.photoUrl);
});

test('TEST-019 后台停轮询、回到页面先查询；重建 Page 仍预览原次候选', async () => {
  const fake = fakeApi();
  fake.setView({ ...idle, status: 'processing', canStart: false });
  const { page, timers } = loadPage(fake.api);
  page.onLoad({ id: '7' });
  await flush();
  assert.ok(timers.size > 0, '处理中应定时查询，而不是让页面等待模型');
  assert.equal(typeof page.onHide, 'function');
  page.onHide();
  assert.equal(timers.size, 0, '后台必须停止客户端查询');
  const before = fake.calls.get.length;
  fake.setView(ready);
  page.onShow();
  await flush();
  assert.ok(fake.calls.get.length > before);
  assert.equal(page.data.normalization.status, 'ready');
  assert.equal(fake.calls.start.length, 0);
  page.onUnload();
  assert.equal(timers.size, 0);
  const reopened = loadPage(fake.api);
  reopened.page.onLoad({ id: '7' });
  await flush();
  assert.equal(
    reopened.page.data.normalization.candidatePhotoUrl,
    'wxfile://candidatePhotoUrl.png',
  );
  assert.equal(fake.calls.start.length, 0);
});

for (const settlesBeforeShow of [true, false]) {
  test(
    'TEST-019 首次读取中切后台恢复原次候选，旧响应在' +
      (settlesBeforeShow ? '后台' : '返回后') +
      '到达均失效',
    async () => {
      const fake = fakeApi();
      fake.setView(ready);
      let resolveFirst;
      let reads = 0;
      fake.api.getGarment = () => {
        reads++;
        return reads === 1
          ? new Promise((done) => {
              resolveFirst = done;
            })
          : Promise.resolve({ item: { ...garment } });
      };
      const { page, timers } = loadPage(fake.api);
      page.onLoad({ id: '7' });
      page.onShow();
      assert.equal(reads, 1, '初次 onShow 不应重复首次读取');
      page.onHide();
      const stale = { item: { ...garment, name: '旧请求不应覆盖衣物' } };
      if (settlesBeforeShow) {
        resolveFirst(stale);
        await flush();
      }
      page.onShow();
      await flush();
      assert.equal(reads, 2, '返回前台应重读被中断的首次请求');
      assert.equal(page.data.loading, false, '返回后不应停在加载中');
      assert.equal(page.data.garment.name, garment.name);
      assert.equal(page.data.normalization.status, 'ready');
      assert.equal(
        page.data.normalization.candidatePhotoUrl,
        'wxfile://candidatePhotoUrl.png',
      );
      assert.equal(fake.calls.start.length, 0, '恢复只能 GET，不能重新生成');
      if (!settlesBeforeShow) {
        const snapshot = JSON.stringify(page.data);
        resolveFirst(stale);
        await flush();
        assert.equal(JSON.stringify(page.data), snapshot);
      }
      page.onUnload();
      assert.equal(timers.size, 0);
    },
  );
}

test('TEST-019 首次读取失败后切后台返回仍可恢复，不以成功加载为前提', async () => {
  const fake = fakeApi();
  fake.setView(ready);
  let reads = 0;
  fake.api.getGarment = async () => {
    if (++reads === 1) throw new Error('首次读取断网');
    return { item: { ...garment } };
  };
  const { page, timers } = loadPage(fake.api);
  page.onLoad({ id: '7' });
  page.onShow();
  await flush();
  assert.match(page.data.error, /首次读取断网/);
  page.onHide();
  page.onShow();
  await flush();
  assert.equal(reads, 2);
  assert.equal(page.data.error, '');
  assert.equal(page.data.loading, false);
  assert.equal(page.data.normalization.status, 'ready');
  assert.equal(fake.calls.start.length, 0);
  page.onUnload();
  assert.equal(timers.size, 0);
});

test('TEST-019 后台或关闭时晚到查询不能覆盖页面或重启轮询', async () => {
  const fake = fakeApi();
  const { page, timers } = loadPage(fake.api);
  page.onLoad({ id: '7' });
  await flush();
  let resolve;
  fake.api.getGarmentNormalization = () =>
    new Promise((done) => {
      resolve = done;
    });
  const pending = page.refreshNormalizationStatus();
  assert.equal(typeof page.onHide, 'function');
  page.onHide();
  const snapshot = JSON.stringify(page.data);
  resolve({ item: { ...ready } });
  await pending;
  await flush();
  assert.equal(JSON.stringify(page.data), snapshot);
  assert.equal(timers.size, 0);
  page.onUnload();
});

test('TEST-019 未知和图片错误不清空衣物、不重发开始或虚称未扣费', async () => {
  const fake = fakeApi();
  fake.setView({
    ...idle,
    status: 'uncertain',
    canStart: false,
    message: '结果待确认，可能已产生本次费用',
  });
  const { page } = loadPage(fake.api);
  page.onLoad({ id: '7' });
  await flush();
  assert.match(page.data.normalization.message, /可能.*费用/);
  await page.startImageNormalization();
  await flush();
  assert.equal(fake.calls.start.length, 0);
  fake.setView(ready);
  fake.api.resolvePrivateImageUrls = async () => {
    throw new Error('图片加载失败');
  };
  await page.refreshNormalizationStatus();
  await flush();
  assert.equal(page.data.garment.name, garment.name);
  assert.match(page.data.normalizationError, /图片/);
  assert.equal(fake.calls.start.length, 0);
});

test('TEST-019 身份变化清缓存且拒绝旧在途图片，外域无令牌、失败可重读', async () => {
  const { createPrivateImageResolver } = require(
    path.join(root, 'miniprogram/utils/image-source'),
  );
  let identity = 'owner-a';
  const requests = [];
  const images = createPrivateImageResolver({
    baseUrl: base,
    getIdentity: () => identity,
    download: (options) => requests.push(options),
  });
  const old = images.resolvePrivateImageUrls({
    candidatePhotoUrl: ready.candidatePhotoUrl,
  });
  identity = 'owner-b';
  requests[0].success({ statusCode: 200, tempFilePath: 'wxfile://old.png' });
  await assert.rejects(old, /身份已变化/);
  const next = images.resolvePrivateImageUrls({
    candidatePhotoUrl: ready.candidatePhotoUrl,
  });
  assert.equal(requests[1].header.Authorization, 'Bearer owner-b');
  requests[1].fail();
  await assert.rejects(next, /暂时无法加载/);
  const retry = images.resolvePrivateImageUrls({
    candidatePhotoUrl: ready.candidatePhotoUrl,
  });
  requests[2].success({
    statusCode: 200,
    tempFilePath: 'wxfile://owner-b.png',
  });
  await retry;
  const foreign =
    'https://other.invalid/api/miniapp/garments/7/photos/candidate?v=12';
  assert.equal(
    (await images.resolvePrivateImageUrls({ candidatePhotoUrl: foreign }))
      .candidatePhotoUrl,
    foreign,
  );
  assert.equal(requests.length, 3);
});

test('TEST-021 只有明确采用才提交同次标识，同步连点幂等、成功只换展示', async () => {
  const fake = fakeApi();
  fake.setView(ready);
  const { page } = loadPage(fake.api);
  page.onLoad({ id: '7' });
  await flush();
  assert.equal(fake.calls.adopt.length, 0);
  assert.equal(
    typeof page.adoptImageNormalization,
    'function',
    '缺少明确采用事件',
  );
  await Promise.all([
    page.adoptImageNormalization(),
    page.adoptImageNormalization(),
  ]);
  await flush();
  assert.equal(fake.calls.adopt.length, 1);
  assert.deepEqual(fake.calls.adopt[0], ['7', ready.attemptKey]);
  assert.equal(page.data.garment.photoUrl, 'wxfile://adopted.png');
  assert.equal(page.data.garment.name, garment.name);
  assert.equal(page.data.garment.originalPhotoUrl, garment.originalPhotoUrl);
  assert.equal(page.data.normalization.adopted, true);
  assert.equal(page.data.normalization.canAdopt, false);
  await page.adoptImageNormalization();
  assert.equal(fake.calls.adopt.length, 1);
  assert.equal(fake.calls.start.length, 0);
});

test('TEST-021 采用失败保留展示及资料，预览关闭不采用、不重新生成', async () => {
  const fake = fakeApi();
  fake.setView(ready);
  fake.api.adoptGarmentNormalization = async () => {
    throw new Error('采用失败');
  };
  const { page } = loadPage(fake.api);
  page.onLoad({ id: '7' });
  await flush();
  assert.equal(typeof page.adoptImageNormalization, 'function');
  await page.adoptImageNormalization();
  assert.equal(page.data.garment.photoUrl, garment.photoUrl);
  assert.equal(page.data.garment.name, garment.name);
  assert.match(page.data.normalizationError, /采用失败/);
  page.dismissNormalizationPreview();
  assert.equal(fake.calls.start.length, 0);
});

test('TEST-021 实际 API 自动解析各当前嵌套出口，带新 v 下载且旧公开图不带令牌', async () => {
  const module = { exports: {} },
    requests = [],
    downloads = [];
  const url = base + '/api/miniapp/garments/7/photos/display?v=12';
  const shapes = [
    { items: [{ ...garment, photoUrl: url }] },
    { item: { ...garment, photoUrl: url } },
    { draft: {}, duplicateCandidates: [{ ...garment, photoUrl: url }] },
    {
      recommendations: [
        { title: '不改', garments: [{ ...garment, photoUrl: url }] },
      ],
    },
    {
      items: [
        {
          outfit: {
            photoUrl: base + '/file/look.webp',
            garments: [{ ...garment, photoUrl: url }],
          },
        },
      ],
    },
    { item: { outfit: { garments: [{ ...garment, photoUrl: url }] } } },
  ];
  let next;
  vm.runInNewContext(read('miniprogram/utils/api.js'), {
    module,
    console,
    Promise,
    require: (id) => require(path.join(root, 'miniprogram/utils', id)),
    wx: {
      getStorageSync: () => 'test-token',
      request: (options) => {
        requests.push(options);
        options.success({ statusCode: 200, data: next });
      },
      uploadFile: (options) => {
        requests.push(options);
        options.success({ statusCode: 201, data: JSON.stringify(next) });
      },
      downloadFile: (options) => {
        downloads.push(options);
        options.success({
          statusCode: 200,
          tempFilePath:
            'wxfile://version-' + options.url.split('v=')[1] + '.png',
        });
      },
    },
  });
  const api = module.exports;
  const calls = [
    () => api.listGarments(),
    () => api.getGarment(7),
    () => api.analyzeGarmentPhoto('wxfile://camera.png'),
    () => api.recommendOutfit('原推荐'),
    () => api.getTodayOutfits(),
    () => api.getDailyOutfitDetail(1),
  ];
  const field = (value) =>
    value.items?.[0]?.photoUrl ||
    value.item?.photoUrl ||
    value.duplicateCandidates?.[0]?.photoUrl ||
    value.recommendations?.[0]?.garments[0].photoUrl ||
    value.items?.[0]?.outfit?.garments[0].photoUrl ||
    value.item?.outfit?.garments[0].photoUrl;
  for (let i = 0; i < calls.length; i++) {
    next = shapes[i];
    assert.equal(
      field(await calls[i]()),
      'wxfile://version-12.png',
      '公开 API 出口未统一解析第 ' + i + ' 种形状',
    );
  }
  assert.equal(downloads.filter((o) => o.url === url).length, 1);
  assert.ok(
    downloads.every(
      (o) =>
        o.url.startsWith(base + '/api/miniapp/garments/') &&
        o.header.Authorization === 'Bearer test-token',
    ),
  );
  next = { item: { ...garment, photoUrl: url.replace('v=12', 'v=13') } };
  assert.equal(
    (await api.getGarment(7)).item.photoUrl,
    'wxfile://version-13.png',
  );
  assert.equal(downloads.filter((o) => o.url.includes('display')).length, 2);
  next = { item: { ...garment } };
  assert.equal((await api.getGarment(7)).item.photoUrl, garment.photoUrl);
  assert.equal(typeof api.adoptGarmentNormalization, 'function');
  await api.adoptGarmentNormalization(7, ready.attemptKey);
  assert.equal(
    requests.at(-1).url,
    base + '/api/miniapp/garments/7/normalization/adopt',
  );
  assert.equal(requests.at(-1).method, 'POST');
  assert.deepEqual(JSON.parse(JSON.stringify(requests.at(-1).data)), {
    attemptKey: ready.attemptKey,
  });
});

test('TEST-021 返回已有推荐只刷新衣物图，不重生推荐、不改变选择和理由', async () => {
  let recommended = 0,
    queried = 0;
  const api = {
    listGarments: async () => {
      queried++;
      return { items: [{ ...garment, photoUrl: 'wxfile://new.png' }] };
    },
    recommendOutfit: async () => {
      recommended++;
      return { recommendations: [] };
    },
    resolvePrivateImageUrls: async (value) => value,
  };
  const { page } = loadPage(api, {
    file: 'miniprogram/pages/outfit/index.js',
    wx: { getStorageSync: () => null },
  });
  page.data.recommendations = [
    {
      title: '原标题',
      reason: '原理由',
      feedbackRating: 5,
      garments: [{ ...garment }],
    },
  ];
  page.data.coreGarmentId = '7';
  page.data.savedIndex = 0;
  page.data.lastRequestText = '原需求';
  page.onShow();
  await flush();
  assert.ok(queried > 0, '返回推荐页没有重新读取当前照片');
  assert.equal(
    page.data.recommendations[0].garments[0].photoUrl,
    'wxfile://new.png',
  );
  assert.equal(page.data.recommendations[0].title, '原标题');
  assert.equal(page.data.recommendations[0].reason, '原理由');
  assert.equal(page.data.recommendations[0].feedbackRating, 5);
  assert.equal(page.data.coreGarmentId, '7');
  assert.equal(page.data.savedIndex, 0);
  assert.equal(recommended, 0);
});

test('TEST-021 模板有明确采用按钮，采用过程中禁用，当前和候选仍完整展示', async () => {
  const template = read('miniprogram/pages/garment-detail/index.wxml');
  assert.match(template, /bindtap="adoptImageNormalization"/);
  assert.match(template, /normalizationAdopting/);
  assert.match(template, /normalization\.canAdopt/);
  assert.match(template, /mode="aspectFit"/);
});

async function main() {
  const name = process.argv[process.argv.indexOf('--case') + 1];
  const asset = {
    'generate-preview': 'TEST-017',
    recovery: 'TEST-019',
    adopt: 'TEST-021',
  }[name];
  assert.ok(asset, '当前登记用例为 generate-preview/recovery');
  const selected = cases.filter((entry) => entry.name.startsWith(asset));
  let failed = 0;
  for (const entry of selected) {
    try {
      await entry.run();
      console.log('PASS ' + entry.name);
    } catch (error) {
      failed++;
      console.error('FAIL ' + entry.name + ': ' + error.message);
    }
  }
  console.log(
    `${asset}：${selected.length - failed} passed，${failed} failed；无真实网络或模型调用`,
  );
  if (failed) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

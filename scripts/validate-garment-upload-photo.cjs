const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const uploadPhoto = require('../miniprogram/utils/garment-upload-photo');
const imageSource = require('../miniprogram/utils/image-source');
const api = require('../miniprogram/utils/api');

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const formJs = read('miniprogram/pages/garment-form/index.js');
const wardrobeJs = read('miniprogram/pages/wardrobe/index.js');
const detailJs = read('miniprogram/pages/garment-detail/index.js');
const imageJs = read('miniprogram/utils/image-source.js');
const mainTs = read('src/main.ts');
const fileService = read('src/file/file-service.abstract.ts');

function loadPage(relativePath) {
  let definition;
  global.Page = function (value) {
    definition = value;
  };
  const absolute = path.join(root, relativePath);
  delete require.cache[absolute];
  require(absolute);
  if (!definition) throw new Error('页面没有注册: ' + relativePath);
  return definition;
}

const formPage = loadPage('miniprogram/pages/garment-form/index.js');
const wardrobePage = loadPage('miniprogram/pages/wardrobe/index.js');
const detailPage = loadPage('miniprogram/pages/garment-detail/index.js');

function bindPage(definition) {
  const ctx = {
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(update, callback) {
      Object.keys(update).forEach(function (key) {
        if (!key.includes('.') && !key.includes('[')) this.data[key] = update[key];
      }, this);
      if (typeof callback === 'function') callback();
    },
  };
  Object.keys(definition).forEach(function (key) {
    if (typeof definition[key] === 'function') ctx[key] = definition[key];
  });
  return ctx;
}

async function flush() {
  for (let i = 0; i < 30; i += 1) await Promise.resolve();
}

function installWx(handlers) {
  const calls = [];
  const wxApi = {
    calls: calls,
    showToast() {},
    navigateBack() {},
    setNavigationBarTitle() {},
    getStorageSync() {
      return {};
    },
    setStorageSync() {},
    chooseMedia(options) {
      calls.push({ name: 'chooseMedia', sizeType: options.sizeType });
      if (handlers.choose) handlers.choose(options);
    },
    getImageInfo(options) {
      const info = handlers.imageInfo
        ? handlers.imageInfo(options.src)
        : { width: 4000, height: 3000 };
      if (!info) options.fail();
      else options.success(info);
    },
    compressImage(options) {
      calls.push({
        name: 'compress',
        quality: options.quality,
        width: options.compressedWidth,
        height: options.compressedHeight,
        src: options.src,
      });
      if (handlers.compress) handlers.compress(options);
      else options.success({ tempFilePath: 'compressed.jpg' });
    },
    getFileSystemManager() {
      return {
        getFileInfo(options) {
          const size = handlers.size ? handlers.size(options.filePath) : 1024;
          if (typeof size !== 'number') options.fail();
          else options.success({ size: size });
        },
      };
    },
  };
  global.wx = wxApi;
  return wxApi;
}

const analyzed = [];
const uploads = [];
api.analyzeGarmentPhoto = function (filePath) {
  analyzed.push(filePath);
  return Promise.resolve({ draft: {}, duplicateCandidates: [] });
};
api.uploadGarment = function (filePath) {
  uploads.push(filePath);
  return Promise.resolve({});
};
api.resolvePrivateImageUrls = function (value) {
  return Promise.resolve(
    Object.assign({}, value, {
      originalPhotoUrl: 'wxfile://original.jpg',
    }),
  );
};

async function test(name, run) {
  try {
    await run();
    console.log('ok', name);
  } catch (error) {
    console.error('fail', name);
    console.error(error);
    process.exitCode = 1;
  }
}

(async function () {
  await test('识别小图仍是质量 60、最长边 900，且不放大', async function () {
    assert.equal(uploadPhoto.analyzeQuality, 60);
    assert.equal(uploadPhoto.analyzeMaxEdge, 900);
    assert.deepEqual(uploadPhoto.limitedPhotoSize(1800, 1200, 900), {
      width: 900,
      height: 600,
    });
    assert.deepEqual(uploadPhoto.limitedPhotoSize(800, 600, 900), {
      width: 800,
      height: 600,
    });
    const wxApi = installWx({
      imageInfo: function () {
        return { width: 1800, height: 1200 };
      },
      compress: function (options) {
        options.success({ tempFilePath: 'analyze.jpg' });
      },
    });
    const path = await uploadPhoto.compressForAnalyze(wxApi, 'camera.jpg');
    assert.equal(path, 'analyze.jpg');
    assert.deepEqual(wxApi.calls[0], {
      name: 'compress',
      quality: 60,
      width: 900,
      height: 600,
      src: 'camera.jpg',
    });
  });

  await test('识别压缩前先复制原图，保存的是这份副本', async function () {
    const copies = [];
    const wxApi = installWx({
      compress: function (options) {
        assert.equal(options.src, 'camera.jpg');
        assert.equal(options.quality, 60);
        options.success({ tempFilePath: 'analyze.jpg' });
      },
    });
    wxApi.env = { USER_DATA_PATH: 'wxfile://usr' };
    wxApi.getFileSystemManager = function () {
      return {
        copyFile: function (options) {
          copies.push(options);
          options.success();
        },
        getFileInfo: function (options) {
          options.success({ size: 2048 });
        },
      };
    };
    const prepared = await uploadPhoto.prepareGarmentUploadPhoto(
      wxApi,
      'camera.jpg',
      2048,
    );
    assert.equal(copies.length, 1);
    assert.equal(copies[0].srcPath, 'camera.jpg');
    assert.match(copies[0].destPath, /^wxfile:\/\/usr\/garment-original-.*\.jpg$/);
    assert.equal(prepared.savePlan, 'original');
    assert.equal(prepared.savePath, copies[0].destPath);
    assert.equal(prepared.analyzePath, 'analyze.jpg');
    assert.notEqual(prepared.savePath, prepared.analyzePath);
  });

  await test('不超过 29MiB 的图原样保存，识别另走小图', async function () {
    const wxApi = installWx({
      compress: function (options) {
        assert.equal(options.quality, 60);
        options.success({ tempFilePath: 'analyze.jpg' });
      },
    });
    const prepared = await uploadPhoto.prepareGarmentUploadPhoto(
      wxApi,
      'camera.jpg',
      3 * 1024 * 1024,
    );
    assert.equal(prepared.savePlan, 'original');
    assert.equal(prepared.savePath, 'camera.jpg');
    assert.equal(prepared.analyzePath, 'analyze.jpg');
    assert.equal(
      wxApi.calls.some(function (call) {
        return call.quality === 95 || call.quality === 90;
      }),
      false,
    );
  });

  await test('超过 nginx 可收的大小时，先按质量 95、最长边 8192 压，且不放大', async function () {
    const wxApi = installWx({
      imageInfo: function () {
        return { width: 2000, height: 1000 };
      },
      size: function () {
        return 1024;
      },
      compress: function (options) {
        options.success({
          tempFilePath: options.quality === 60 ? 'analyze.jpg' : 'hq.jpg',
        });
      },
    });
    const prepared = await uploadPhoto.prepareGarmentUploadPhoto(
      wxApi,
      'camera.jpg',
      uploadPhoto.maxSaveBytes + 1,
    );
    assert.equal(prepared.savePlan, 'high-quality-8192');
    assert.equal(prepared.savePath, 'hq.jpg');
    assert.equal(prepared.analyzePath, 'analyze.jpg');
    const hq = wxApi.calls.find(function (call) {
      return call.quality === 95;
    });
    assert.deepEqual(
      { quality: hq.quality, width: hq.width, height: hq.height },
      { quality: 95, width: 2000, height: 1000 },
    );
  });

  await test('8192 仍然太大时，再按质量 90、最长边 4096 压', async function () {
    const wxApi = installWx({
      imageInfo: function () {
        return { width: 9000, height: 6000 };
      },
      size: function (filePath) {
        return filePath === 'edge4096.jpg' ? 1024 : uploadPhoto.maxSaveBytes + 5;
      },
      compress: function (options) {
        const name =
          options.quality === 60
            ? 'analyze.jpg'
            : options.quality === 95
              ? 'edge8192.jpg'
              : 'edge4096.jpg';
        options.success({ tempFilePath: name });
      },
    });
    const prepared = await uploadPhoto.prepareGarmentUploadPhoto(
      wxApi,
      'camera.jpg',
      uploadPhoto.maxSaveBytes + 1,
    );
    assert.equal(prepared.savePlan, 'high-quality-4096');
    assert.equal(prepared.savePath, 'edge4096.jpg');
    assert.equal(prepared.analyzePath, 'analyze.jpg');
    const second = wxApi.calls.find(function (call) {
      return call.quality === 90;
    });
    assert.equal(second.width, 4096);
    assert.equal(second.height, 2731);
  });

  await test('高清晰度兜底仍放不下时，保存退回识别小图', async function () {
    const wxApi = installWx({
      size: function () {
        return uploadPhoto.maxSaveBytes + 5;
      },
      compress: function (options) {
        options.success({
          tempFilePath: options.quality === 60 ? 'analyze.jpg' : 'still-big.jpg',
        });
      },
    });
    const prepared = await uploadPhoto.prepareGarmentUploadPhoto(
      wxApi,
      'camera.jpg',
      uploadPhoto.maxSaveBytes + 1,
    );
    assert.equal(prepared.savePlan, 'analyze-compressed');
    assert.equal(prepared.savePath, 'analyze.jpg');
    assert.equal(prepared.analyzePath, 'analyze.jpg');
  });

  await test('单件选择原图，保存和识别使用不同文件', async function () {
    analyzed.length = 0;
    uploads.length = 0;
    installWx({
      choose: function (options) {
        options.success({
          tempFiles: [{ tempFilePath: 'camera.jpg', size: 2 * 1024 * 1024 }],
        });
      },
      imageInfo: function () {
        return { width: 4000, height: 3000 };
      },
      compress: function (options) {
        assert.equal(options.quality, 60);
        options.success({ tempFilePath: 'analyze.jpg' });
      },
    });
    const ctx = bindPage(formPage);
    ctx.choosePhoto();
    await flush();
    assert.equal(ctx.data.photoPath, 'camera.jpg');
    assert.deepEqual(analyzed, ['analyze.jpg']);
    ctx.submitGarment();
    await flush();
    assert.deepEqual(uploads, ['camera.jpg']);
  });

  await test('单件保存上传复制出来的原图，不上传识别小图', async function () {
    analyzed.length = 0;
    uploads.length = 0;
    installWx({
      choose: function (options) {
        assert.deepEqual(options.sizeType, ['original']);
        options.success({
          tempFiles: [{ tempFilePath: 'camera.jpg', size: 2 * 1024 * 1024 }],
        });
      },
      compress: function (options) {
        assert.equal(options.src, 'camera.jpg');
        options.success({ tempFilePath: 'analyze.jpg' });
      },
    });
    global.wx.env = { USER_DATA_PATH: 'wxfile://usr' };
    global.wx.getFileSystemManager = function () {
      return {
        copyFile: function (options) {
          options.success();
        },
        getFileInfo: function (options) {
          options.success({ size: 2 * 1024 * 1024 });
        },
      };
    };
    const ctx = bindPage(formPage);
    ctx.choosePhoto();
    await flush();
    assert.match(ctx.data.photoPath, /^wxfile:\/\/usr\/garment-original-.*\.jpg$/);
    assert.notEqual(ctx.data.photoPath, 'analyze.jpg');
    ctx.submitGarment();
    await flush();
    assert.deepEqual(uploads, [ctx.data.photoPath]);
    assert.deepEqual(analyzed, ['analyze.jpg']);
  });

  await test('原图太大时，保存会等兜底图准备好，不会先把超限原图传上去', async function () {
    analyzed.length = 0;
    uploads.length = 0;
    let releaseHq;
    installWx({
      choose: function (options) {
        options.success({
          tempFiles: [
            {
              tempFilePath: 'camera.jpg',
              size: uploadPhoto.maxSaveBytes + 1,
            },
          ],
        });
      },
      imageInfo: function () {
        return { width: 8000, height: 6000 };
      },
      size: function () {
        return 1024;
      },
      compress: function (options) {
        if (options.quality === 60) {
          options.success({ tempFilePath: 'analyze.jpg' });
          return;
        }
        releaseHq = function () {
          options.success({ tempFilePath: 'hq.jpg' });
        };
      },
    });
    const ctx = bindPage(formPage);
    ctx.choosePhoto();
    await flush();
    assert.equal(uploads.length, 0);
    ctx.submitGarment();
    await flush();
    assert.deepEqual(uploads, []);
    releaseHq();
    await flush();
    assert.equal(ctx.data.photoPath, 'hq.jpg');
    assert.deepEqual(uploads, ['hq.jpg']);
    assert.deepEqual(analyzed, ['analyze.jpg']);
  });

  await test('批量导入取原图路径，识别仍上传压缩图', async function () {
    analyzed.length = 0;
    const wxApi = installWx({
      choose: function (options) {
        assert.deepEqual(options.sizeType, ['original']);
        options.success({
          tempFiles: [
            { tempFilePath: 'one.jpg', size: 10 },
            { tempFilePath: 'two.jpg', size: 20 },
          ],
        });
      },
    });
    const ctx = bindPage(wardrobePage);
    ctx.startBulkImport = function (files) {
      this.imported = files;
    };
    ctx.chooseBulkImport();
    assert.deepEqual(ctx.imported, ['one.jpg', 'two.jpg']);
    assert.deepEqual(wxApi.calls[0].sizeType, ['original']);

    installWx({
      imageInfo: function () {
        return { width: 2000, height: 1000 };
      },
      compress: function (options) {
        options.success({ tempFilePath: 'bulk-small.jpg' });
      },
    });
    const analyzeCtx = bindPage(wardrobePage);
    global.wx.getStorageSync = function () {
      return { files: ['one.jpg'] };
    };
    global.wx.setStorageSync = function () {};
    await analyzeCtx.analyzeBulkPhoto(0, 'one.jpg');
    assert.deepEqual(analyzed, ['bulk-small.jpg']);
    assert.equal(global.wx.calls[0].quality, 60);
    assert.equal(global.wx.calls[0].width, 900);
    assert.equal(global.wx.calls[0].height, 450);
  });

  await test('查看原图只打开下载到的文件，不再压缩', async function () {
    const downloads = [];
    const resolver = imageSource.createPrivateImageResolver({
      baseUrl: 'https://aimatchwear.asia',
      getIdentity: function () {
        return 'token';
      },
      download: function (options) {
        downloads.push(options);
        options.success({
          statusCode: 200,
          tempFilePath: 'wxfile://original.jpg',
          header: { 'content-type': 'image/jpeg' },
        });
      },
    });
    const resolved = await resolver.resolvePrivateImageUrls({
      originalPhotoUrl:
        'https://aimatchwear.asia/api/miniapp/garments/7/photos/original?v=11',
    });
    assert.equal(resolved.originalPhotoUrl, 'wxfile://original.jpg');
    assert.equal(downloads[0].quality, undefined);
    assert.equal(downloads[0].header.Authorization, 'Bearer token');

    const previews = [];
    installWx({});
    global.wx.previewImage = function (options) {
      previews.push(options);
    };
    const ctx = bindPage(detailPage);
    ctx._loadSequence = 1;
    ctx.data.garment = {
      originalPhotoUrl:
        'https://aimatchwear.asia/api/miniapp/garments/7/photos/original?v=11',
    };
    await ctx.previewOriginalPhoto();
    await flush();
    assert.equal(previews.length, 1);
    assert.equal(previews[0].current, 'wxfile://original.jpg');
    assert.deepEqual(previews[0].urls, ['wxfile://original.jpg']);
    assert.equal(
      global.wx.calls.some(function (call) {
        return call.name === 'compress';
      }),
      false,
    );
  });

  await test('页面和上限配置没有退回旧的保存压缩', function () {
    assert.equal(formJs.includes("sizeType: ['original']"), true);
    assert.equal(formJs.includes("sizeType: ['compressed']"), false);
    assert.equal(formJs.includes('quality: 60'), false);
    assert.equal(formJs.includes('uploadGarment(this.data.photoPath'), true);
    assert.equal(wardrobeJs.includes("sizeType: ['original']"), true);
    assert.equal(wardrobeJs.includes("sizeType: ['compressed']"), false);
    assert.equal(wardrobeJs.includes('quality: 60'), false);
    assert.equal(detailJs.includes('compressImage'), false);
    assert.equal(detailJs.includes('wx.previewImage'), true);
    assert.equal(/compressImage|compressedWidth|quality/.test(imageJs), false);
    assert.match(mainTs, /fileSize:\s*100 \* 1024 \* 1024/);
    assert.match(fileService, /resize\(1080,\s*1080/);
    assert.equal(uploadPhoto.maxUploadBodyBytes, 30 * 1024 * 1024);
    assert.equal(uploadPhoto.maxSaveBytes, 29 * 1024 * 1024);
  });

  if (process.exitCode) {
    throw new Error('衣物原图上传校验失败');
  }
  console.log('Garment original upload photo validation passed.');
})().catch(function (error) {
  console.error(error);
  process.exit(1);
});

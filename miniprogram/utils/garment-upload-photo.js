// 保存用的图和 AI 识别用的图分开。
// 公网 nginx 的 client_max_body_size 是 30MiB（31457280 能进到程序，再多 1 字节就被 nginx 拒绝）。
// 服务端 multipart 单文件上限是 100MB，但请求先过 nginx，所以实际上传不能超过 30MiB。
// 微信 wx.uploadFile 文档没有写死文件大小；这里留 1MiB 给表单字段，原图不超过 29MiB 就原样保存。
const analyzeMaxEdge = 900;
const analyzeQuality = 60;
const maxUploadBodyBytes = 30 * 1024 * 1024;
const multipartReserveBytes = 1024 * 1024;
const maxSaveBytes = maxUploadBodyBytes - multipartReserveBytes;
const highQualitySteps = [
  { quality: 95, maxEdge: 8192, plan: 'high-quality-8192' },
  { quality: 90, maxEdge: 4096, plan: 'high-quality-4096' },
];

function limitedPhotoSize(width, height, maxEdge) {
  if (!width || !height) {
    return { width: maxEdge, height: maxEdge };
  }
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width: width, height: height };
  }
  const ratio = maxEdge / longest;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function exceedsSaveLimit(byteSize) {
  return typeof byteSize === 'number' && byteSize > maxSaveBytes;
}

function readFileSize(wxApi, filePath, knownSize) {
  if (typeof knownSize === 'number' && knownSize >= 0) {
    return Promise.resolve(knownSize);
  }
  const fileSystem = wxApi.getFileSystemManager && wxApi.getFileSystemManager();
  const owner =
    fileSystem && fileSystem.getFileInfo
      ? fileSystem
      : wxApi.getFileInfo
        ? wxApi
        : null;
  if (!owner) return Promise.resolve(undefined);
  return new Promise(function (resolve) {
    owner.getFileInfo({
      filePath: filePath,
      success: function (res) {
        resolve(res && typeof res.size === 'number' ? res.size : undefined);
      },
      fail: function () {
        resolve(undefined);
      },
    });
  });
}

function readImageSize(wxApi, filePath) {
  return new Promise(function (resolve) {
    if (!wxApi.getImageInfo) {
      resolve(null);
      return;
    }
    wxApi.getImageInfo({
      src: filePath,
      success: function (info) {
        resolve(
          info && info.width && info.height
            ? { width: info.width, height: info.height }
            : null,
        );
      },
      fail: function () {
        resolve(null);
      },
    });
  });
}

function compress(wxApi, filePath, options) {
  return readImageSize(wxApi, filePath).then(function (info) {
    return new Promise(function (resolve, reject) {
      if (!wxApi.compressImage) {
        reject(new Error('compressImage unavailable'));
        return;
      }
      const request = {
        src: filePath,
        quality: options.quality,
        success: function (res) {
          resolve((res && res.tempFilePath) || filePath);
        },
        fail: function () {
          reject(new Error('compressImage failed'));
        },
      };
      if (info) {
        const size = limitedPhotoSize(info.width, info.height, options.maxEdge);
        request.compressedWidth = size.width;
        request.compressedHeight = size.height;
      } else if (options.squareIfUnknown) {
        request.compressedWidth = options.maxEdge;
        request.compressedHeight = options.maxEdge;
      }
      wxApi.compressImage(request);
    });
  });
}

function compressForAnalyze(wxApi, filePath) {
  return compress(wxApi, filePath, {
    quality: analyzeQuality,
    maxEdge: analyzeMaxEdge,
    squareIfUnknown: true,
  }).catch(function () {
    return filePath;
  });
}

function shrinkUntilItFits(wxApi, sourcePath, analyzePath, stepIndex) {
  const step = highQualitySteps[stepIndex];
  if (!step) {
    return Promise.resolve({
      savePath: analyzePath,
      analyzePath: analyzePath,
      savePlan: 'analyze-compressed',
    });
  }
  return compress(wxApi, sourcePath, {
    quality: step.quality,
    maxEdge: step.maxEdge,
    squareIfUnknown: false,
  })
    .then(function (path) {
      return readFileSize(wxApi, path).then(function (byteSize) {
        if (!exceedsSaveLimit(byteSize)) {
          return {
            savePath: path,
            analyzePath: analyzePath,
            savePlan: step.plan,
          };
        }
        return shrinkUntilItFits(wxApi, sourcePath, analyzePath, stepIndex + 1);
      });
    })
    .catch(function () {
      return shrinkUntilItFits(wxApi, sourcePath, analyzePath, stepIndex + 1);
    });
}

function prepareGarmentUploadPhoto(wxApi, filePath, knownSize) {
  return Promise.all([
    readFileSize(wxApi, filePath, knownSize),
    compressForAnalyze(wxApi, filePath),
  ]).then(function (parts) {
    const byteSize = parts[0];
    const analyzePath = parts[1];
    if (!exceedsSaveLimit(byteSize)) {
      return {
        savePath: filePath,
        analyzePath: analyzePath,
        savePlan: 'original',
      };
    }
    return shrinkUntilItFits(wxApi, filePath, analyzePath, 0);
  });
}

module.exports = {
  analyzeMaxEdge: analyzeMaxEdge,
  analyzeQuality: analyzeQuality,
  maxUploadBodyBytes: maxUploadBodyBytes,
  maxSaveBytes: maxSaveBytes,
  highQualitySteps: highQualitySteps,
  limitedPhotoSize: limitedPhotoSize,
  exceedsSaveLimit: exceedsSaveLimit,
  compressForAnalyze: compressForAnalyze,
  prepareGarmentUploadPhoto: prepareGarmentUploadPhoto,
};

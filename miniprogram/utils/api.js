const API_BASE_URL = 'https://aimatchwear.asia';

function request(path, options) {
  options = options || {};
  return new Promise(function (resolve, reject) {
    wx.request({
      url: API_BASE_URL + path,
      method: options.method || 'GET',
      data: options.data,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        console.warn('api request bad status', path, res.statusCode, res.data);
        reject(new Error(res.data && res.data.message ? res.data.message : '服务器连接失败，请稍后重试'));
      },
      fail(error) {
        console.warn('api request failed', path, error);
        reject(new Error('服务器连接失败，请稍后重试'));
      },
    });
  });
}

function uploadGarment(filePath, formData) {
  return new Promise(function (resolve, reject) {
    wx.uploadFile({
      url: API_BASE_URL + '/api/miniapp/garments',
      filePath: filePath,
      name: 'photo',
      formData: formData,
      timeout: 180000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(res.data));
          } catch (error) {
            reject(new Error('服务器返回格式不正确'));
          }
          return;
        }
        console.warn('uploadGarment bad status', res.statusCode, res.data);
        reject(new Error('上传失败，请重新选择图片'));
      },
      fail(error) {
        console.warn('uploadGarment failed', error);
        reject(new Error('上传失败，请重新选择图片'));
      },
    });
  });
}

function analyzeGarmentPhoto(filePath) {
  return new Promise(function (resolve, reject) {
    wx.uploadFile({
      url: API_BASE_URL + '/api/miniapp/garments/analyze',
      filePath: filePath,
      name: 'photo',
      timeout: 180000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(res.data));
          } catch (error) {
            reject(new Error('服务器返回格式不正确'));
          }
          return;
        }
        console.warn('analyzeGarmentPhoto bad status', res.statusCode, res.data);
        reject(new Error('AI识别失败，请手动填写'));
      },
      fail(error) {
        console.warn('analyzeGarmentPhoto failed', error);
        reject(new Error('AI识别失败，请手动填写'));
      },
    });
  });
}

module.exports = {
  API_BASE_URL: API_BASE_URL,
  listGarments: function () {
    return request('/api/miniapp/garments');
  },
  getGarment: function (id) {
    return request('/api/miniapp/garments/' + id);
  },
  updateGarment: function (id, formData) {
    return request('/api/miniapp/garments/' + id, {
      method: 'POST',
      data: formData,
    });
  },
  deleteGarment: function (id) {
    return request('/api/miniapp/garments/' + id, { method: 'DELETE', data: {} });
  },
  recommendOutfit: function (requestText, coreGarmentId) {
    const data = { requestText: requestText };
    if (coreGarmentId) {
      data.coreGarmentId = coreGarmentId;
    }
    return request('/api/miniapp/outfits/recommend', {
      method: 'POST',
      data: data,
    });
  },
  saveDailyOutfit: function (plan, date) {
    return request('/api/miniapp/daily-outfits', {
      method: 'POST',
      data: {
        date: date,
        title: plan.title,
        reason: plan.reason,
        garmentIds: (plan.garments || []).map(function (garment) {
          return garment.id;
        }),
      },
    });
  },
  getTodayOutfits: function (date) {
    return request('/api/miniapp/daily-outfits/today' + (date ? '?date=' + date : ''));
  },
  analyzeGarmentPhoto: analyzeGarmentPhoto,
  uploadGarment: uploadGarment,
  wardrobeBackupUrl: function () {
    return API_BASE_URL + '/api/miniapp/garments/backup/export';
  },
};

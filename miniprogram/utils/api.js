const API_BASE_URL = 'https://aimatchwear.asia';
const TOKEN_KEY = 'miniapp_access_token';
let loginPromise = null;

function tokenHeader() {
  const token = wx.getStorageSync(TOKEN_KEY);
  return token ? { Authorization: 'Bearer ' + token } : {};
}

function loginMiniapp(force) {
  if (!force && wx.getStorageSync(TOKEN_KEY)) {
    return Promise.resolve(wx.getStorageSync(TOKEN_KEY));
  }
  if (loginPromise) return loginPromise;

  loginPromise = new Promise(function (resolve, reject) {
    wx.login({
      success(loginRes) {
        if (!loginRes.code) {
          reject(new Error('微信登录失败，请重新进入小程序'));
          return;
        }
        wx.request({
          url: API_BASE_URL + '/api/miniapp/auth/login',
          method: 'POST',
          data: { code: loginRes.code },
          success(res) {
            if (
              res.statusCode >= 200 &&
              res.statusCode < 300 &&
              res.data &&
              res.data.accessToken
            ) {
              wx.setStorageSync(TOKEN_KEY, res.data.accessToken);
              resolve(res.data.accessToken);
              return;
            }
            reject(
              new Error(
                res.data && res.data.message
                  ? res.data.message
                  : '微信登录失败，请稍后重试',
              ),
            );
          },
          fail(error) {
            console.warn('miniapp login request failed', error);
            reject(new Error('微信登录失败，请稍后重试'));
          },
        });
      },
      fail(error) {
        console.warn('wx.login failed', error);
        reject(new Error('微信登录失败，请重新进入小程序'));
      },
    });
  });

  return loginPromise.then(
    function (token) {
      loginPromise = null;
      return token;
    },
    function (error) {
      loginPromise = null;
      throw error;
    },
  );
}

function request(path, options) {
  options = options || {};
  return loginMiniapp().then(function () {
    return new Promise(function (resolve, reject) {
      wx.request({
        url: API_BASE_URL + path,
        method: options.method || 'GET',
        data: options.data,
        header: Object.assign({}, tokenHeader(), options.header || {}),
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
            return;
          }
          console.warn(
            'api request bad status',
            path,
            res.statusCode,
            res.data,
          );
          reject(
            new Error(
              res.data && res.data.message
                ? res.data.message
                : '服务器连接失败，请稍后重试',
            ),
          );
        },
        fail(error) {
          console.warn('api request failed', path, error);
          reject(new Error('服务器连接失败，请稍后重试'));
        },
      });
    });
  });
}

function uploadGarment(filePath, formData) {
  return loginMiniapp().then(function () {
    return new Promise(function (resolve, reject) {
      wx.uploadFile({
        url: API_BASE_URL + '/api/miniapp/garments',
        filePath: filePath,
        name: 'photo',
        formData: formData,
        header: tokenHeader(),
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
  });
}

function uploadDailyOutfit(filePath, formData) {
  return loginMiniapp().then(function () {
    return new Promise(function (resolve, reject) {
      wx.uploadFile({
        url: API_BASE_URL + '/api/miniapp/daily-outfits',
        filePath: filePath,
        name: 'photo',
        formData: formData,
        header: tokenHeader(),
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
          console.warn(
            'uploadDailyOutfit bad status',
            res.statusCode,
            res.data,
          );
          reject(new Error('保存今日穿搭失败，请重新选择照片'));
        },
        fail(error) {
          console.warn('uploadDailyOutfit failed', error);
          reject(new Error('保存今日穿搭失败，请重新选择照片'));
        },
      });
    });
  });
}

function analyzeGarmentPhoto(filePath) {
  return loginMiniapp().then(function () {
    return new Promise(function (resolve, reject) {
      wx.uploadFile({
        url: API_BASE_URL + '/api/miniapp/garments/analyze',
        filePath: filePath,
        name: 'photo',
        header: tokenHeader(),
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
          console.warn(
            'analyzeGarmentPhoto bad status',
            res.statusCode,
            res.data,
          );
          reject(new Error('AI识别失败，请手动填写'));
        },
        fail(error) {
          console.warn('analyzeGarmentPhoto failed', error);
          reject(new Error('AI识别失败，请手动填写'));
        },
      });
    });
  });
}

function importWardrobeBackup(filePath) {
  return loginMiniapp().then(function () {
    return new Promise(function (resolve, reject) {
      wx.uploadFile({
        url: API_BASE_URL + '/api/miniapp/garments/backup/import',
        filePath: filePath,
        name: 'backup',
        header: tokenHeader(),
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
          console.warn(
            'importWardrobeBackup bad status',
            res.statusCode,
            res.data,
          );
          reject(new Error('备份导入失败，请确认文件是否正确'));
        },
        fail(error) {
          console.warn('importWardrobeBackup failed', error);
          reject(new Error('备份导入失败，请重新选择文件'));
        },
      });
    });
  });
}

module.exports = {
  API_BASE_URL: API_BASE_URL,
  loginMiniapp: loginMiniapp,
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
    return request('/api/miniapp/garments/' + id, {
      method: 'DELETE',
      data: {},
    });
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
  saveDailyOutfit: function (plan, date, photoPath) {
    if (!photoPath) {
      return Promise.reject(new Error('请先拍一张今日穿搭照片'));
    }
    return uploadDailyOutfit(photoPath, {
      date: date,
      title: plan.title || '今日穿搭',
      reason: plan.reason || '',
      garmentIds: JSON.stringify(
        (plan.garments || []).map(function (garment) {
          return garment.id;
        }),
      ),
    });
  },
  saveManualOutfit: function (form) {
    return uploadDailyOutfit(form.photoPath, {
      date: form.date,
      title: form.title || '今日穿搭',
      reason: form.reason || '',
      scene: form.scene || '',
      rating: form.rating || '',
      feedback: form.feedback || '',
      garmentIds: JSON.stringify(form.garmentIds || []),
    });
  },
  getTodayOutfits: function (date) {
    return request(
      '/api/miniapp/daily-outfits/today' + (date ? '?date=' + date : ''),
    );
  },
  deleteDailyOutfit: function (id) {
    return request('/api/miniapp/daily-outfits/' + id, {
      method: 'DELETE',
      data: {},
    });
  },
  getDailyOutfitDetail: function (id) {
    return request('/api/miniapp/daily-outfits/' + id + '/detail');
  },
  updateDailyOutfit: function (id, form) {
    if (form.photoPath) {
      return loginMiniapp().then(function () {
        return new Promise(function (resolve, reject) {
          wx.uploadFile({
            url: API_BASE_URL + '/api/miniapp/daily-outfits/' + id,
            filePath: form.photoPath,
            name: 'photo',
            formData: {
              date: form.date || '',
              title: form.title || '',
              reason: form.reason || '',
              scene: form.scene || '',
              rating: form.rating || '',
              feedback: form.feedback || '',
              garmentIds: JSON.stringify(form.garmentIds || []),
            },
            header: tokenHeader(),
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
              console.warn(
                'updateDailyOutfit upload bad status',
                res.statusCode,
                res.data,
              );
              reject(new Error('修改失败，请稍后重试'));
            },
            fail(error) {
              console.warn('updateDailyOutfit upload failed', error);
              reject(new Error('修改失败，请稍后重试'));
            },
          });
        });
      });
    }
    return request('/api/miniapp/daily-outfits/' + id, {
      method: 'POST',
      data: {
        title: form.title || '',
        reason: form.reason || '',
        scene: form.scene || '',
        rating: form.rating || '',
        feedback: form.feedback || '',
        garmentIds: JSON.stringify(form.garmentIds || []),
      },
    });
  },
  analyzeGarmentPhoto: analyzeGarmentPhoto,
  uploadGarment: uploadGarment,
  importWardrobeBackup: importWardrobeBackup,
  wardrobeBackupUrl: function () {
    return API_BASE_URL + '/api/miniapp/garments/backup/export';
  },
  wardrobeBackupHeaders: function () {
    return loginMiniapp().then(function () {
      return tokenHeader();
    });
  },
};

const API_BASE_URL = 'https://aimatchwear.asia';
const TOKEN_KEY = 'miniapp_access_token';
let loginPromise = null;
const privateImages = require('./image-source').createPrivateImageResolver({
  baseUrl: API_BASE_URL,
  getIdentity: function () {
    return wx.getStorageSync(TOKEN_KEY);
  },
  download: function (options) {
    return wx.downloadFile(options);
  },
});

function resolvePrivateImageUrls(value) {
  return loginMiniapp().then(function () {
    return privateImages.resolvePrivateImageUrls(value);
  });
}

function tokenHeader() {
  const token = wx.getStorageSync(TOKEN_KEY);
  return token ? { Authorization: 'Bearer ' + token } : {};
}

// 全部图片业务出口统一解析；单图失败仍返回衣物资料，身份变化则拒绝旧响应。
function imageResponse(value) {
  return privateImages.resolvePrivateImageUrls(value, true);
}
function imageRequest(path, options) {
  return request(path, options).then(imageResponse);
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
    const requestIdentity = wx.getStorageSync(TOKEN_KEY);
    return new Promise(function (resolve, reject) {
      wx.request({
        url: API_BASE_URL + path,
        method: options.method || 'GET',
        data: options.data,
        header: Object.assign({}, tokenHeader(), options.header || {}),
        timeout: options.timeout,
        success(res) {
          if (wx.getStorageSync(TOKEN_KEY) !== requestIdentity) {
            reject(new Error('登录身份已变化，请重新查看'));
            return;
          }
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
              imageResponse(JSON.parse(res.data)).then(resolve, reject);
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
              imageResponse(JSON.parse(res.data)).then(resolve, reject);
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
              imageResponse(JSON.parse(res.data)).then(resolve, reject);
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

function getUserProfile() {
  return request('/api/miniapp/profile');
}

function updateUserProfile(form) {
  form = form || {};
  if (form.avatarPath) {
    return loginMiniapp().then(function () {
      return new Promise(function (resolve, reject) {
        wx.uploadFile({
          url: API_BASE_URL + '/api/miniapp/profile',
          filePath: form.avatarPath,
          name: 'avatar',
          formData: {
            nickname: form.nickname || '',
            bio: form.bio || '',
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
              'updateUserProfile bad status',
              res.statusCode,
              res.data,
            );
            reject(new Error('保存失败，请重试'));
          },
          fail(error) {
            console.warn('updateUserProfile failed', error);
            reject(new Error('保存失败，请重试'));
          },
        });
      });
    });
  }
  return request('/api/miniapp/profile', {
    method: 'POST',
    data: {
      nickname: form.nickname || '',
      bio: form.bio || '',
    },
  });
}

module.exports = {
  startGarmentNormalization: function (id, attemptKey) {
    return request('/api/miniapp/garments/' + id + '/normalization', {
      method: 'POST',
      data: { attemptKey: attemptKey },
      timeout: 30000,
    });
  },
  getGarmentNormalization: function (id) {
    return request('/api/miniapp/garments/' + id + '/normalization');
  },
  adoptGarmentNormalization: function (id, attemptKey) {
    return imageRequest(
      '/api/miniapp/garments/' + id + '/normalization/adopt',
      {
        method: 'POST',
        data: { attemptKey: attemptKey },
      },
    );
  },
  API_BASE_URL: API_BASE_URL,
  loginMiniapp: loginMiniapp,
  resolvePrivateImageUrls: resolvePrivateImageUrls,
  getUserProfile: getUserProfile,
  updateUserProfile: updateUserProfile,
  listGarments: function () {
    return imageRequest('/api/miniapp/garments');
  },
  getGarmentTaxonomy: function () {
    return request('/api/miniapp/garments/taxonomy');
  },
  getGarment: function (id) {
    return imageRequest('/api/miniapp/garments/' + id);
  },
  updateGarment: function (id, formData) {
    return imageRequest('/api/miniapp/garments/' + id, {
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
  recommendOutfit: function (requestText, coreGarmentId, weather) {
    const data = { requestText: requestText };
    data.weather = weather || { mode: 'unavailable' };
    if (coreGarmentId) {
      data.coreGarmentId = coreGarmentId;
    }
    return imageRequest('/api/miniapp/outfits/recommend', {
      method: 'POST',
      data: data,
    });
  },
  submitOutfitFeedback: function (payload) {
    return request('/api/miniapp/outfit-feedback', {
      method: 'POST',
      data: payload,
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
    return imageRequest(
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
    return imageRequest('/api/miniapp/daily-outfits/' + id + '/detail');
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
                  imageResponse(JSON.parse(res.data)).then(resolve, reject);
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
    return imageRequest('/api/miniapp/daily-outfits/' + id, {
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
  feedbackExcelUrl: function () {
    return API_BASE_URL + '/api/miniapp/outfit-feedback/export.xlsx';
  },
  getAdminUsers: function () {
    return request('/api/miniapp/admin/users');
  },
  getAdminUserGarments: function (userId) {
    return request('/api/miniapp/admin/users/' + userId + '/garments');
  },
  backfillAdminUserGarmentTags: function (userId, limit) {
    return request(
      '/api/miniapp/admin/users/' + userId + '/garments/backfill-tags',
      {
        method: 'POST',
        data: { limit: limit },
        timeout: 120000,
      },
    );
  },
  adminInventoryExcelUrl: function (userId) {
    return (
      API_BASE_URL +
      '/api/miniapp/admin/users/' +
      userId +
      '/garments/export.xlsx'
    );
  },
  setAdminAcceptanceSandbox: function (userId, enabled) {
    return request(
      '/api/miniapp/admin/users/' + userId + '/acceptance-sandbox',
      {
        method: 'POST',
        data: { enabled: enabled === true },
      },
    );
  },
  previewAdminWardrobeCopy: function (sourceUserId, targetUserId) {
    return request(
      '/api/miniapp/admin/wardrobe-copy/preview?sourceUserId=' +
        sourceUserId +
        '&targetUserId=' +
        targetUserId,
    );
  },
  copyAdminWardrobe: function (payload) {
    return request('/api/miniapp/admin/wardrobe-copy', {
      method: 'POST',
      data: payload,
      timeout: 120000,
    });
  },
  adminExcelHeaders: function () {
    return loginMiniapp().then(function () {
      return tokenHeader();
    });
  },
  feedbackExcelHeaders: function () {
    return loginMiniapp().then(function () {
      return tokenHeader();
    });
  },
  wardrobeBackupHeaders: function () {
    return loginMiniapp().then(function () {
      return tokenHeader();
    });
  },
};

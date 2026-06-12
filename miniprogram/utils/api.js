const API_BASE_URL = 'https://aimatchwear.asia';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${path}`,
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
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${API_BASE_URL}/api/miniapp/garments`,
      filePath,
      name: 'photo',
      formData,
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

module.exports = {
  API_BASE_URL,
  listGarments: () => request('/api/miniapp/garments'),
  getGarment: (id) => request(`/api/miniapp/garments/${id}`),
  deleteGarment: (id) => request(`/api/miniapp/garments/${id}`, { method: 'DELETE' }),
  uploadGarment,
};

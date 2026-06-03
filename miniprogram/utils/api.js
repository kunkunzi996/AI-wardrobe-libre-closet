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
        reject(new Error(res.data && res.data.message ? res.data.message : '服务器连接失败，请稍后重试'));
      },
      fail() {
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
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(res.data));
          } catch (error) {
            reject(new Error('服务器返回格式不正确'));
          }
          return;
        }
        reject(new Error('上传失败，请重新选择图片'));
      },
      fail() {
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

const api = require('../../utils/api');

Page({
  data: {
    garments: [],
    loading: false,
    error: '',
  },

  onLoad() {
    this.loadGarments();
  },

  onShow() {
    if (this.data.loadedOnce) {
      this.loadGarments();
    }
  },

  onPullDownRefresh() {
    this.loadGarments().finally(function () {
      wx.stopPullDownRefresh();
    });
  },

  retryLoad() {
    this.loadGarments();
  },

  loadGarments() {
    const page = this;
    this.setData({ loading: true, error: '' });
    return api
      .listGarments()
      .then(function (data) {
        page.setData({
        garments: data.items || [],
        loadedOnce: true,
      });
      })
      .catch(function (error) {
        page.setData({ error: error.message || '服务器连接失败，请稍后重试' });
      })
      .finally(function () {
        page.setData({ loading: false });
      });
  },

  goToAdd() {
    wx.navigateTo({ url: '/pages/garment-form/index' });
  },

  goToOutfit() {
    wx.navigateTo({ url: '/pages/outfit/index' });
  },

  goToDaily() {
    wx.navigateTo({ url: '/pages/daily-outfit/index' });
  },

  goToDetail(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/garment-detail/index?id=' + id });
  },
});

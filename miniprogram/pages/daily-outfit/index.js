const api = require('../../utils/api');

Page({
  data: {
    date: '',
    items: [],
    loading: false,
    error: '',
  },

  onLoad() {
    this.loadToday();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    if (this.data.loadedOnce) {
      this.loadToday();
    }
  },

  onPullDownRefresh() {
    this.loadToday().finally(function () {
      wx.stopPullDownRefresh();
    });
  },

  retryLoad() {
    this.loadToday();
  },

  loadToday() {
    const date = this.todayDate();
    const page = this;
    this.setData({ loading: true, error: '', date });
    return api
      .getTodayOutfits(date)
      .then(function (data) {
        page.setData({
          items: data.items || [],
          loadedOnce: true,
        });
      })
      .catch(function (error) {
        page.setData({ error: error.message || '今日穿搭加载失败' });
      })
      .finally(function () {
        page.setData({ loading: false });
      });
  },

  goToWardrobe() {
    wx.switchTab({ url: '/pages/wardrobe/index' });
  },

  goToOutfit() {
    wx.switchTab({ url: '/pages/outfit/index' });
  },

  goToAddOutfit() {
    wx.navigateTo({ url: '/pages/add-outfit/index' });
  },

  goToGarment(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/garment-detail/index?id=' + id });
  },

  todayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  },
});

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
    if (this.data.loadedOnce) {
      this.loadToday();
    }
  },

  onPullDownRefresh() {
    this.loadToday().finally(() => wx.stopPullDownRefresh());
  },

  retryLoad() {
    this.loadToday();
  },

  async loadToday() {
    const date = this.todayDate();
    this.setData({ loading: true, error: '', date });
    try {
      const data = await api.getTodayOutfits(date);
      this.setData({
        items: data.items || [],
        loadedOnce: true,
      });
    } catch (error) {
      this.setData({ error: error.message || '今日穿搭加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goToWardrobe() {
    wx.reLaunch({ url: '/pages/wardrobe/index' });
  },

  goToOutfit() {
    wx.navigateTo({ url: '/pages/outfit/index' });
  },

  goToGarment(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/garment-detail/index?id=${id}` });
  },

  todayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
});

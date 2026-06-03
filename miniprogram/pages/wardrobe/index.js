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
    this.loadGarments().finally(() => wx.stopPullDownRefresh());
  },

  async loadGarments() {
    this.setData({ loading: true, error: '' });
    try {
      const data = await api.listGarments();
      this.setData({
        garments: data.items || [],
        loadedOnce: true,
      });
    } catch (error) {
      this.setData({ error: error.message || '服务器连接失败，请稍后重试' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goToAdd() {
    wx.navigateTo({ url: '/pages/garment-form/index' });
  },

  goToDetail(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/garment-detail/index?id=${id}` });
  },
});

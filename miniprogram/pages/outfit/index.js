const api = require('../../utils/api');

Page({
  data: {
    requestText: '明天上班穿什么',
    loading: false,
    error: '',
    message: '',
    recommendations: [],
  },

  onInput(event) {
    this.setData({ requestText: event.detail.value });
  },

  async generateOutfit() {
    const requestText = this.data.requestText.trim();
    if (!requestText) {
      this.setData({ error: '先告诉 AI 你想穿去什么场合' });
      return;
    }

    this.setData({ loading: true, error: '', message: '' });
    try {
      const data = await api.recommendOutfit(requestText);
      this.setData({
        recommendations: data.recommendations || [],
        message: data.message || '',
      });
    } catch (error) {
      this.setData({ error: error.message || 'AI搭配失败，请稍后重试' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goToWardrobe() {
    wx.reLaunch({ url: '/pages/wardrobe/index' });
  },

  goToGarment(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/garment-detail/index?id=${id}` });
  },
});

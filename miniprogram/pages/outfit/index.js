const api = require('../../utils/api');

Page({
  data: {
    requestText: '明天上班穿什么',
    loading: false,
    error: '',
    message: '',
    recommendations: [],
    savingIndex: -1,
    savedIndex: -1,
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
        savedIndex: -1,
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

  goToDaily() {
    wx.navigateTo({ url: '/pages/daily-outfit/index' });
  },

  async saveDailyOutfit(event) {
    const index = Number(event.currentTarget.dataset.index);
    const plan = this.data.recommendations[index];
    if (!plan || !plan.garments || plan.garments.length === 0) {
      this.setData({ error: '这套搭配里还没有衣物，先重新生成一次' });
      return;
    }

    this.setData({ savingIndex: index, error: '' });
    try {
      await api.saveDailyOutfit(plan, this.todayDate());
      this.setData({ savedIndex: index });
      wx.showToast({ title: '已保存到今日穿搭', icon: 'success' });
    } catch (error) {
      this.setData({ error: error.message || '保存今日穿搭失败' });
    } finally {
      this.setData({ savingIndex: -1 });
    }
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

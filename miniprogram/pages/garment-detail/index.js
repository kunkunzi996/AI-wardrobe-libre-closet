const api = require('../../utils/api');

Page({
  data: {
    id: '',
    garment: null,
    loading: false,
    error: '',
  },

  onLoad(options) {
    this.setData({ id: options.id || '' });
    this.loadGarment();
  },

  async loadGarment() {
    if (!this.data.id) return;
    this.setData({ loading: true, error: '' });
    try {
      const data = await api.getGarment(this.data.id);
      this.setData({ garment: data.item });
    } catch (error) {
      this.setData({ error: error.message || '服务器连接失败，请稍后重试' });
    } finally {
      this.setData({ loading: false });
    }
  },

  deleteGarment() {
    wx.showModal({
      title: '删除衣物',
      content: '确定删除这件衣物吗？',
      confirmText: '删除',
      confirmColor: '#d96c3f',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.deleteGarment(this.data.id);
          wx.showToast({ title: '已删除' });
          wx.navigateBack();
        } catch (error) {
          this.setData({ error: error.message || '服务器连接失败，请稍后重试' });
        }
      },
    });
  },
});

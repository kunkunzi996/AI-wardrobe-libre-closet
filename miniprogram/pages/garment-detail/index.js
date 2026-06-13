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

  loadGarment() {
    if (!this.data.id) return;
    const page = this;
    this.setData({ loading: true, error: '' });
    return api
      .getGarment(this.data.id)
      .then(function (data) {
        page.setData({ garment: data.item });
      })
      .catch(function (error) {
        page.setData({ error: error.message || '服务器连接失败，请稍后重试' });
      })
      .finally(function () {
        page.setData({ loading: false });
      });
  },

  reloadGarment() {
    this.loadGarment();
  },

  goBackToWardrobe() {
    wx.reLaunch({ url: '/pages/wardrobe/index' });
  },

  goToEdit() {
    if (!this.data.id) return;
    wx.navigateTo({ url: '/pages/garment-form/index?id=' + this.data.id });
  },

  deleteGarment() {
    const page = this;
    wx.showModal({
      title: '删除衣物',
      content: '确定删除这件衣物吗？',
      confirmText: '删除',
      confirmColor: '#d96c3f',
      success(res) {
        if (!res.confirm) return;
        api
          .deleteGarment(page.data.id)
          .then(function () {
            wx.showToast({ title: '已删除' });
            wx.navigateBack();
          })
          .catch(function (error) {
            page.setData({ error: error.message || '服务器连接失败，请稍后重试' });
          });
      },
    });
  },
});

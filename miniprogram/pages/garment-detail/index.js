const api = require('../../utils/api');

const seasonLabelMap = {
  spring: '春天',
  summer: '夏天',
  autumn: '秋天',
  fall: '秋天',
  winter: '冬天',
  'all-season': '四季',
  春: '春天',
  夏: '夏天',
  秋: '秋天',
  冬: '冬天',
  四季: '四季',
};

function withDisplayLabels(garment) {
  if (!garment) return garment;
  const nextGarment = Object.assign({}, garment);
  nextGarment.seasonDisplay =
    seasonLabelMap[garment.season] || seasonLabelMap[garment.seasonLabel] || garment.seasonLabel || garment.season || '-';
  return nextGarment;
}

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

  onShow() {
    if (this.data.loadedOnce) {
      this.loadGarment();
    }
  },

  loadGarment() {
    if (!this.data.id) return;
    const page = this;
    this.setData({ loading: true, error: '' });
    return api
      .getGarment(this.data.id)
      .then(function (data) {
        page.setData({
          garment: withDisplayLabels(data.item),
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

  reloadGarment() {
    this.loadGarment();
  },

  goBackToWardrobe() {
    wx.switchTab({ url: '/pages/wardrobe/index' });
  },

  goToEdit() {
    if (!this.data.id) return;
    wx.navigateTo({ url: '/pages/garment-form/index?id=' + this.data.id });
  },

  goToOutfitRecommendation() {
    if (!this.data.id) return;
    // 搭配页是 tab 页，switchTab 不能带参数，改用全局变量中转
    getApp().globalData.pendingCoreGarmentId = this.data.id;
    wx.switchTab({ url: '/pages/outfit/index' });
  },

  deleteGarment() {
    const page = this;
    wx.showModal({
      title: '删除衣物',
      content: '确定删除这件衣物吗？',
      confirmText: '删除',
      confirmColor: '#c0392b',
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

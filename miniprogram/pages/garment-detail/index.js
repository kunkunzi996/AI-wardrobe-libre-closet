const api = require('../../utils/api');
const imageNormalization = require('./image-normalization');

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
    seasonLabelMap[garment.season] ||
    seasonLabelMap[garment.seasonLabel] ||
    garment.seasonLabel ||
    garment.season ||
    '-';
  return nextGarment;
}

Page({
  data: {
    id: '',
    garment: null,
    loading: false,
    error: '',
    originalLoading: false,
    normalization: null,
    normalizationStarting: false,
    normalizationAdopting: false,
    normalizationPreviewVisible: false,
    normalizationError: '',
  },

  onLoad(options) {
    this._normalizer = imageNormalization.createImageNormalization(this);
    this.setData({ id: options.id || '' });
    this.loadGarment();
  },

  onShow() {
    // 首次 onShow 复用 onLoad 的读取；隐藏后的恢复只由可见性决定。
    if (!this._needsResume) return;
    this._needsResume = false;
    if (this._normalizer) this._normalizer.resume();
    this.loadGarment();
  },

  onHide() {
    this._needsResume = true;
    if (this._normalizer) this._normalizer.stop();
    this._loadSequence = (this._loadSequence || 0) + 1;
  },

  onUnload() {
    if (this._normalizer) this._normalizer.stop();
    this._loadSequence = (this._loadSequence || 0) + 1;
  },

  loadGarment() {
    if (!this.data.id) return;
    const page = this;
    const sequence = (this._loadSequence = (this._loadSequence || 0) + 1);
    this.setData({ loading: true, originalLoading: false, error: '' });
    return api
      .getGarment(this.data.id)
      .then(function (data) {
        if (sequence !== page._loadSequence) return;
        page.setData({
          garment: withDisplayLabels(data.item),
          loadedOnce: true,
          error: data.item.imageError || '',
        });
        // 资料先显示；单张图片失败不能清空已读取的衣物信息。
        return api
          .resolvePrivateImageUrls({ photoUrl: data.item.photoUrl })
          .then(function (resolved) {
            if (sequence !== page._loadSequence) return;
            page.setData({ 'garment.photoUrl': resolved.photoUrl });
            return page._normalizer && page._normalizer.load();
          });
      })
      .catch(function (error) {
        if (sequence !== page._loadSequence) return;
        page.setData({ error: error.message || '服务器连接失败，请稍后重试' });
      })
      .finally(function () {
        if (sequence !== page._loadSequence) return;
        page.setData({ loading: false });
      });
  },

  previewOriginalPhoto() {
    const garment = this.data.garment;
    if (!garment || !garment.originalPhotoUrl || this.data.originalLoading)
      return;
    const page = this;
    const sequence = this._loadSequence;
    this.setData({ originalLoading: true, error: '' });
    return api
      .resolvePrivateImageUrls({ originalPhotoUrl: garment.originalPhotoUrl })
      .then(function (resolved) {
        if (sequence !== page._loadSequence) return;
        wx.previewImage({
          current: resolved.originalPhotoUrl,
          urls: [resolved.originalPhotoUrl],
          fail() {
            if (sequence !== page._loadSequence) return;
            page.setData({ error: '原图暂时无法查看，请稍后重试' });
          },
        });
      })
      .catch(function (error) {
        if (sequence === page._loadSequence) {
          page.setData({
            error: error.message || '原图暂时无法查看，请稍后重试',
          });
        }
      })
      .finally(function () {
        if (sequence !== page._loadSequence) return;
        page.setData({ originalLoading: false });
      });
  },

  reloadGarment() {
    this.loadGarment();
  },

  startImageNormalization() {
    return this._normalizer && this._normalizer.start();
  },
  adoptImageNormalization() {
    return this._normalizer && this._normalizer.adopt();
  },
  dismissNormalizationPreview() {
    if (this._normalizer) this._normalizer.dismiss();
  },
  refreshNormalizationStatus() {
    return this._normalizer && this._normalizer.load();
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
            page.setData({
              error: error.message || '服务器连接失败，请稍后重试',
            });
          });
      },
    });
  },
});

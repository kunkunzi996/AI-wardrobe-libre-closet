const api = require('../../utils/api');

const sceneOptions = ['通勤', '约会', '休闲', '正式', '运动', '其他'];

const categoryTintMap = {
  tops: 'tint-lavender',
  bottoms: 'tint-peach',
  outerwear: 'tint-mint',
  dresses: 'tint-rose',
  footwear: 'tint-sky',
  bags: 'tint-sky',
  accessories: 'tint-rose',
  other: 'tint-lavender',
};

function decorateGarment(garment) {
  return Object.assign({}, garment, {
    tintClass: categoryTintMap[garment.category] || 'tint-lavender',
  });
}

Page({
  data: {
    entryId: 0,
    date: '',
    photoPath: '',
    originalPhotoUrl: '',
    reason: '',
    feedback: '',
    sceneOptions: sceneOptions,
    sceneIndex: 0,
    customScene: '',
    rating: 0,
    garments: [],
    selectedGarmentIds: [],
    selectedGarmentMap: {},
    loading: false,
    saving: false,
    error: '',
  },

  onLoad(options) {
    const entryId = Number(options.id);
    if (!entryId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(function () {
        wx.navigateBack();
      }, 1000);
      return;
    }
    this.setData({ entryId: entryId, date: this.todayDate() });
    this.loadDetail(entryId);
    this.loadGarments();
  },

  choosePhoto() {
    const page = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.tempFilePath) return;
        page.setData({ photoPath: file.tempFilePath });
      },
    });
  },

  loadGarments() {
    const page = this;
    this.setData({ loading: true, error: '' });
    return api
      .listGarments()
      .then(function (data) {
        page.setData({
          garments: (data.items || []).map(decorateGarment),
        });
      })
      .catch(function (error) {
        page.setData({ error: error.message || '衣柜加载失败' });
      })
      .finally(function () {
        page.setData({ loading: false });
      });
  },

  loadDetail(id) {
    const page = this;
    this.setData({ loading: true, error: '' });
    return api
      .getDailyOutfitDetail(id)
      .then(function (data) {
        const item = data.item || {};
        const outfit = item.outfit || {};
        const garmentIds = (outfit.garments || []).map(function (garment) {
          return garment.id;
        });
        const selectedGarmentMap = {};
        garmentIds.forEach(function (gid) {
          selectedGarmentMap[gid] = true;
        });

        const scene = item.scene || '';
        const sceneIndex = page.data.sceneOptions.indexOf(scene);
        page.setData({
          originalPhotoUrl: outfit.photoUrl || '',
          photoPath: '',
          reason: item.notes || '',
          feedback: item.feedback || '',
          sceneIndex: sceneIndex >= 0 ? sceneIndex : 0,
          customScene: sceneIndex < 0 ? scene : '',
          rating: item.rating || 0,
          selectedGarmentIds: garmentIds,
          selectedGarmentMap: selectedGarmentMap,
        });
      })
      .catch(function (error) {
        page.setData({ error: error.message || '加载失败' });
      })
      .finally(function () {
        page.setData({ loading: false });
      });
  },

  onReasonInput(event) {
    this.setData({ reason: event.detail.value });
  },

  onFeedbackInput(event) {
    this.setData({ feedback: event.detail.value });
  },

  onSceneChange(event) {
    this.setData({ sceneIndex: Number(event.detail.value) });
  },

  onCustomSceneInput(event) {
    this.setData({ customScene: event.detail.value });
  },

  setRating(event) {
    this.setData({ rating: Number(event.currentTarget.dataset.value) });
  },

  toggleSelect(event) {
    const id = Number(event.currentTarget.dataset.id);
    if (!id) return;
    const selectedGarmentMap = Object.assign({}, this.data.selectedGarmentMap);
    if (selectedGarmentMap[id]) {
      delete selectedGarmentMap[id];
    } else {
      selectedGarmentMap[id] = true;
    }
    const selectedGarmentIds = Object.keys(selectedGarmentMap).map(
      function (key) {
        return Number(key);
      },
    );
    this.setData({
      selectedGarmentMap: selectedGarmentMap,
      selectedGarmentIds: selectedGarmentIds,
    });
  },

  save() {
    if (this.data.saving) return;
    if (!this.data.originalPhotoUrl && !this.data.photoPath) {
      wx.showToast({ title: '请先选择照片', icon: 'none' });
      return;
    }

    const page = this;
    const scene =
      this.data.customScene.trim() || sceneOptions[this.data.sceneIndex] || '';
    this.setData({ saving: true, error: '' });
    api
      .updateDailyOutfit(this.data.entryId, {
        photoPath: this.data.photoPath,
        date: this.data.date,
        title: '今日穿搭',
        reason: this.data.reason.trim(),
        scene: scene,
        rating: this.data.rating || '',
        feedback: this.data.feedback.trim(),
        garmentIds: this.data.selectedGarmentIds,
      })
      .then(function () {
        wx.showToast({ title: '已保存', icon: 'success' });
        setTimeout(function () {
          wx.navigateBack();
        }, 300);
      })
      .catch(function (error) {
        page.setData({ error: error.message || '保存失败，请稍后重试' });
      })
      .finally(function () {
        page.setData({ saving: false });
      });
  },

  todayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  },
});

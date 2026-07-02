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
    coreGarmentId: '',
    lastRequestText: '',
    lastSource: '',
  },

  onLoad(options) {
    const coreGarmentId = options.coreGarmentId || '';
    if (!coreGarmentId) return;
    this.setData({
      coreGarmentId: coreGarmentId,
      requestText: '围绕这件衣服，帮我搭一套完整穿搭',
    });
    this.generateOutfit();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    // 从「衣物详情 - 围绕这件搭配」用全局变量带过来的核心衣物
    const app = getApp();
    const pending = app.globalData && app.globalData.pendingCoreGarmentId;
    if (pending) {
      app.globalData.pendingCoreGarmentId = '';
      this.setData({
        coreGarmentId: pending,
        requestText: '围绕这件衣服，帮我搭一套完整穿搭',
      });
      this.generateOutfit();
    }
  },

  onInput(event) {
    this.setData({ requestText: event.detail.value });
  },

  generateOutfit() {
    const requestText = this.data.requestText.trim();
    if (!requestText) {
      this.setData({ error: '先告诉 AI 你想穿去什么场合' });
      return;
    }

    const page = this;
    this.setData({ loading: true, error: '', message: '' });
    api
      .recommendOutfit(requestText, this.data.coreGarmentId)
      .then(function (data) {
        const recommendations = (data.recommendations || []).map(
          function (plan) {
            plan.feedbackRating = '';
            plan.feedbackComment = '';
            plan.feedbackSubmitting = false;
            plan.feedbackSubmitted = false;
            return plan;
          },
        );
        page.setData({
          recommendations: recommendations,
          message: data.message || '',
          savedIndex: -1,
          lastRequestText: requestText,
          lastSource: data.source || '',
        });
      })
      .catch(function (error) {
        page.setData({ error: error.message || 'AI搭配失败，请稍后重试' });
      })
      .finally(function () {
        page.setData({ loading: false });
      });
  },

  goToWardrobe() {
    wx.switchTab({ url: '/pages/wardrobe/index' });
  },

  goToDaily() {
    wx.switchTab({ url: '/pages/daily-outfit/index' });
  },

  saveDailyOutfit(event) {
    const index = Number(event.currentTarget.dataset.index);
    const plan = this.data.recommendations[index];
    if (!plan || !plan.garments || plan.garments.length === 0) {
      this.setData({ error: '这套搭配里还没有衣物，先重新生成一次' });
      return;
    }

    const page = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.tempFilePath) return;
        page.setData({ savingIndex: index, error: '' });
        api
          .saveDailyOutfit(plan, page.todayDate(), file.tempFilePath)
          .then(function () {
            page.setData({ savedIndex: index });
            wx.showToast({ title: '已保存到今日穿搭', icon: 'success' });
          })
          .catch(function (error) {
            page.setData({ error: error.message || '保存今日穿搭失败' });
          })
          .finally(function () {
            page.setData({ savingIndex: -1 });
          });
      },
    });
  },

  onFeedbackRating(event) {
    const index = Number(event.currentTarget.dataset.index);
    const rating = event.currentTarget.dataset.rating;
    const plan = this.data.recommendations[index];
    if (!plan || plan.feedbackSubmitted || plan.feedbackSubmitting) return;
    this.setData({
      ['recommendations[' + index + '].feedbackRating']: rating,
    });
  },

  onFeedbackInput(event) {
    const index = Number(event.currentTarget.dataset.index);
    this.setData({
      ['recommendations[' + index + '].feedbackComment']: event.detail.value,
    });
  },

  submitFeedback(event) {
    const index = Number(event.currentTarget.dataset.index);
    const plan = this.data.recommendations[index];
    if (!plan || plan.feedbackSubmitted || plan.feedbackSubmitting) return;
    if (!plan.feedbackRating) {
      wx.showToast({ title: '先选一个评价再提交', icon: 'none' });
      return;
    }

    const page = this;
    this.setData({
      ['recommendations[' + index + '].feedbackSubmitting']: true,
    });
    api
      .submitOutfitFeedback({
        rating: plan.feedbackRating,
        comment: (plan.feedbackComment || '').trim(),
        requestText: this.data.lastRequestText || this.data.requestText,
        planTitle: plan.title || '',
        planReason: plan.reason || '',
        garmentIds: (plan.garments || []).map(function (garment) {
          return garment.id;
        }),
        source: this.data.lastSource || '',
        coreGarmentId: this.data.coreGarmentId || '',
      })
      .then(function () {
        page.setData({
          ['recommendations[' + index + '].feedbackSubmitted']: true,
        });
        wx.showToast({ title: '感谢你的反馈', icon: 'success' });
      })
      .catch(function (error) {
        wx.showToast({
          title: error.message || '反馈提交失败，请稍后重试',
          icon: 'none',
        });
      })
      .finally(function () {
        page.setData({
          ['recommendations[' + index + '].feedbackSubmitting']: false,
        });
      });
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

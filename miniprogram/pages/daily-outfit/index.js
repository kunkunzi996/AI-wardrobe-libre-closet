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
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    if (this.data.loadedOnce) {
      this.loadToday();
    }
  },

  onPullDownRefresh() {
    this.loadToday().finally(function () {
      wx.stopPullDownRefresh();
    });
  },

  retryLoad() {
    this.loadToday();
  },

  loadToday() {
    const date = this.todayDate();
    const page = this;
    this.setData({ loading: true, error: '', date });
    return api
      .getTodayOutfits(date)
      .then(function (data) {
        page.setData({
          items: data.items || [],
          loadedOnce: true,
        });
      })
      .catch(function (error) {
        page.setData({ error: error.message || '今日穿搭加载失败' });
      })
      .finally(function () {
        page.setData({ loading: false });
      });
  },

  goToWardrobe() {
    wx.switchTab({ url: '/pages/wardrobe/index' });
  },

  goToOutfit() {
    wx.switchTab({ url: '/pages/outfit/index' });
  },

  goToAddOutfit() {
    wx.navigateTo({ url: '/pages/add-outfit/index' });
  },

  goToGarment(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/garment-detail/index?id=' + id });
  },

  onEntryLongPress(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    const page = this;
    wx.showActionSheet({
      itemList: ['删除这条穿搭'],
      itemColor: '#e64340',
      success: function (res) {
        if (res.tapIndex !== 0) return;
        wx.showModal({
          title: '删除穿搭',
          content: '删除后无法恢复，确定删除吗？',
          confirmText: '删除',
          confirmColor: '#e64340',
          success: function (modalRes) {
            if (!modalRes.confirm) return;
            wx.showLoading({ title: '删除中...' });
            api
              .deleteDailyOutfit(id)
              .then(function () {
                wx.showToast({ title: '已删除', icon: 'success' });
                return page.loadToday();
              })
              .catch(function (error) {
                wx.showToast({
                  title: error.message || '删除失败',
                  icon: 'none',
                });
              })
              .finally(function () {
                wx.hideLoading();
              });
          },
        });
      },
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

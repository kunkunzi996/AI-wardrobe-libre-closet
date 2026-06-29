const api = require('../../utils/api');

const defaultNickname = 'AI 衣橱用户';
const defaultBio = '衣橱爱好者、极简主义者。用穿搭整理生活。';

const categoryGroups = [
  {
    key: 'tops',
    label: '上装',
    tintClass: 'tint-lavender',
    iconClass: 'icon-top',
  },
  {
    key: 'bottoms',
    label: '下装',
    tintClass: 'tint-peach',
    iconClass: 'icon-bottom',
  },
  {
    key: 'footwear',
    label: '鞋履',
    tintClass: 'tint-sky',
    iconClass: 'icon-shoes',
  },
  {
    key: 'accessories',
    label: '配饰',
    tintClass: 'tint-rose',
    iconClass: 'icon-accessory',
  },
];

const profileCategoryMap = {
  tops: 'tops',
  outerwear: 'tops',
  dresses: 'tops',
  bottoms: 'bottoms',
  footwear: 'footwear',
  bags: 'accessories',
  accessories: 'accessories',
};

function buildStats(garments) {
  const counts = {
    tops: 0,
    bottoms: 0,
    footwear: 0,
    accessories: 0,
  };

  garments.forEach(function (garment) {
    const group = profileCategoryMap[garment.category];
    if (group && counts[group] !== undefined) {
      counts[group] += 1;
    }
  });

  const total = garments.length;
  const completion = Math.min(100, Math.max(0, Math.round((total / 150) * 100)));

  return {
    total: total,
    completion: completion,
    categories: categoryGroups.map(function (group) {
      return Object.assign({}, group, { count: counts[group.key] || 0 });
    }),
  };
}

Page({
  data: {
    loading: false,
    error: '',
    total: 0,
    completion: 0,
    nickname: defaultNickname,
    bio: defaultBio,
    avatarUrl: '',
    categories: categoryGroups.map(function (group) {
      return Object.assign({}, group, { count: 0 });
    }),
  },

  onLoad() {
    this.loadProfile();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    if (this.data.loadedOnce) {
      this.loadProfile();
    }
  },

  onPullDownRefresh() {
    this.loadProfile().finally(function () {
      wx.stopPullDownRefresh();
    });
  },

  loadProfile() {
    const page = this;
    this.setData({ loading: true, error: '' });
    this.loadUserProfile();
    return api
      .listGarments()
      .then(function (data) {
        const stats = buildStats(data.items || []);
        page.setData({
          total: stats.total,
          completion: stats.completion,
          categories: stats.categories,
          loadedOnce: true,
        });
      })
      .catch(function (error) {
        page.setData({
          error: error.message || '资料加载失败，请稍后重试',
        });
      })
      .finally(function () {
        page.setData({ loading: false });
      });
  },

  retryLoad() {
    this.loadProfile();
  },

  loadUserProfile() {
    const page = this;
    return api
      .getUserProfile()
      .then(function (res) {
        const profile = (res && res.item) || {};
        page.setData({
          nickname: profile.nickname || defaultNickname,
          bio: profile.bio || defaultBio,
          avatarUrl: profile.avatarUrl || '',
        });
      })
      .catch(function () {
        // 资料加载失败不影响衣橱统计展示；用户下拉刷新会再试。
      });
  },

  goToWardrobe() {
    wx.switchTab({ url: '/pages/wardrobe/index' });
  },

  goToOutfit() {
    wx.switchTab({ url: '/pages/daily-outfit/index' });
  },

  goToSettings() {
    wx.showToast({ title: '设置功能稍后接入', icon: 'none' });
  },

  editProfile() {
    wx.navigateTo({ url: '/pages/profile-edit/index' });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '当前小程序会自动使用微信登录。确认后将清除本地登录状态，下次进入会重新登录。',
      confirmText: '退出',
      confirmColor: '#c0392b',
      success: function (res) {
        if (!res.confirm) return;
        wx.removeStorageSync('miniapp_access_token');
        wx.showToast({ title: '已退出', icon: 'success' });
      },
    });
  },
});
